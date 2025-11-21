import { renderMarkdown } from "../utils/markdown.js";

const STORAGE_KEY = "miff:notes";

export function createNotesApp({ contentService }) {
  return {
    id: "notes",
    title: "Notes",
    icon: "📝",
    width: 520,
    height: 520,
    mount: (container) => mountNotes(container, contentService),
  };
}

function mountNotes(container, contentService) {
  container.innerHTML = `
    <section class="notes-app">
      <header class="notes-toolbar">
        <label>
          Mode
          <select class="notes-mode">
            <option value="split" selected>Split view</option>
            <option value="edit">Edit only</option>
            <option value="preview">Preview only</option>
          </select>
        </label>
        <button type="button" class="notes-copy">Copy to clipboard</button>
        <span class="notes-status" aria-live="polite">Unsaved</span>
      </header>
      <div class="notes-editor-stack">
        <textarea class="notes-editor" spellcheck="false" aria-label="Notes editor"></textarea>
        <article class="notes-preview" aria-label="Markdown preview"></article>
      </div>
      <details class="snippet-panel">
        <summary>Quest & dialogue snippets</summary>
        <p class="text-muted">Insert canonical quest blurbs or dialogue beats as scaffolding.</p>
        <div class="snippet-list" data-state="loading">Loading snippets…</div>
      </details>
    </section>
  `;

  const textarea = container.querySelector(".notes-editor");
  const preview = container.querySelector(".notes-preview");
  const status = container.querySelector(".notes-status");
  const modeSelect = container.querySelector(".notes-mode");
  const snippetPanel = container.querySelector(".snippet-panel");
  const snippetList = container.querySelector(".snippet-list");
  const copyBtn = container.querySelector(".notes-copy");

  const saved = loadFromStorage();
  textarea.value = saved.content;
  updatePreview();
  updateStatus(saved.updatedAt);

  const persist = debounce(() => {
    const nextValue = textarea.value;
    const snapshot = { content: nextValue, updatedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    updateStatus(snapshot.updatedAt);
    updatePreview();
  }, 250);

  textarea.addEventListener("input", persist);
  textarea.addEventListener("blur", persist.flush);

  const applyMode = (mode) => {
    if (mode === "preview") {
      textarea.style.display = "none";
      preview.style.display = "block";
    } else if (mode === "edit") {
      textarea.style.display = "block";
      preview.style.display = "none";
    } else {
      textarea.style.display = "block";
      preview.style.display = "block";
    }
  };

  modeSelect.addEventListener("change", () => applyMode(modeSelect.value));
  applyMode(modeSelect.value);

  snippetPanel.addEventListener("toggle", () => {
    if (snippetPanel.open && snippetList.dataset.state === "loading") {
      hydrateSnippets(snippetList, contentService, (snippetText) => insertSnippet(textarea, snippetText, persist));
    }
  });

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(textarea.value);
      copyBtn.textContent = "Copied";
      setTimeout(() => (copyBtn.textContent = "Copy to clipboard"), 1400);
    } catch (error) {
      console.warn("Clipboard unsupported", error);
      copyBtn.textContent = "Select manually";
    }
  });

  return () => {
    textarea.removeEventListener("input", persist);
    textarea.removeEventListener("blur", persist.flush);
  };

  function updatePreview() {
    preview.innerHTML = renderMarkdown(textarea.value || "Use markdown to capture beats, TODOs, or transcripts.");
  }

  function updateStatus(timestamp) {
    if (!timestamp) {
      status.textContent = "Unsaved";
      return;
    }
    const formatted = new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    status.textContent = `Saved ${formatted}`;
  }
}

function insertSnippet(textarea, snippetText, persist) {
  const target = textarea;
  const { selectionStart, selectionEnd, value } = target;
  const nextValue = `${value.slice(0, selectionStart)}${snippetText}\n\n${value.slice(selectionEnd)}`;
  target.value = nextValue;
  const cursor = selectionStart + snippetText.length + 2;
  target.selectionStart = cursor;
  target.selectionEnd = cursor;
  target.focus();
  persist.flush();
}

async function hydrateSnippets(container, contentService, onInsert) {
  container.dataset.state = "loading";
  container.textContent = "Loading snippets…";
  try {
    const snippets = await contentService.getSnippetOptions();
    if (!snippets.length) {
      container.textContent = "No snippets available.";
      return;
    }
    container.dataset.state = "ready";
    container.innerHTML = "";
    snippets.forEach((snippet) => {
      const card = document.createElement("article");
      card.className = "snippet-card";
      card.innerHTML = `
        <header><strong>${snippet.type === "quest" ? "Quest" : "Dialogue"}</strong><div>${snippet.label}</div></header>
        <button type="button">Insert</button>
      `;
      card.querySelector("button").addEventListener("click", () => onInsert(snippet.text));
      container.appendChild(card);
    });
  } catch (error) {
    console.error("Failed to load snippets", error);
    container.dataset.state = "error";
    container.textContent = "Unable to reach the content service. Using local snippets.";
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { content: defaultNote(), updatedAt: null };
    }
    const parsed = JSON.parse(raw);
    return {
      content: parsed.content ?? defaultNote(),
      updatedAt: parsed.updatedAt ?? null,
    };
  } catch (error) {
    console.warn("Failed to parse notes payload", error);
    return { content: defaultNote(), updatedAt: null };
  }
}

function defaultNote() {
  return `# Daily MIFF desk\n\n- Capture beats from quests\n- Summarize player escalations\n- Track NPC escalations\n\nUse the snippet drawer below to drop lore seeds.`;
}

function debounce(callback, wait = 200) {
  let timeout = null;
  const debounced = (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => callback(...args), wait);
  };
  debounced.flush = () => {
    clearTimeout(timeout);
    callback();
  };
  return debounced;
}

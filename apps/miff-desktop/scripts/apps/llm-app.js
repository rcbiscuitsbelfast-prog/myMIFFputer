const HISTORY_KEY = "miff:llm:history";
const SYSTEM_PROMPTS = [
  {
    id: "lore-guide",
    label: "Lore Guide (default)",
    prompt:
      "You are the MIFF lore coordinator. Answer with grounded, spoiler-safe details and include actionable follow ups when useful.",
  },
  {
    id: "npc-voice",
    label: "NPC Voice (diegetic)",
    prompt:
      "Respond as an in-world NPC that has perfect recall of quest states but never breaks character. Offer flavorful but concise direction.",
  },
  {
    id: "designer-notes",
    label: "Designer Notes",
    prompt:
      "Speak like a senior quest designer summarizing decisions, risks, and next design tasks. You may include checklists.",
  },
];

export function createLLMApp({ contentService, llmService }) {
  return {
    id: "llm",
    title: "LLM Relay",
    icon: "✨",
    width: 640,
    height: 560,
    mount: (container) => mountLLM(container, contentService, llmService),
  };
}

function mountLLM(container, contentService, llmService) {
  container.innerHTML = `
    <section class="llm-app">
      <header class="llm-header">
        <label>
          System prompt
          <select class="llm-system"></select>
        </label>
        <span class="status-pill warn" data-role="llm-status">Idle</span>
      </header>
      <div class="llm-messages" aria-live="polite"></div>
      <section class="llm-context">
        <header>
          <div>
            <strong>Context snippets</strong>
            <p class="text-muted">Select relevant quests or dialogue. They will be prefixed to your next message.</p>
          </div>
          <button type="button" class="insert-snippets">Insert selected</button>
        </header>
        <div class="llm-snippet-list" data-role="snippet-list">Loading snippets…</div>
      </section>
      <form class="llm-controls">
        <textarea placeholder="Ask lore questions, pitch quest changes, or summarize playtests…"></textarea>
        <footer>
          <small class="llm-hint">Messages persist locally so you can swap between windows without losing context.</small>
          <button type="submit">Send</button>
        </footer>
      </form>
    </section>
  `;

  const systemSelect = container.querySelector(".llm-system");
  const statusPill = container.querySelector("[data-role='llm-status']");
  const messagesEl = container.querySelector(".llm-messages");
  const snippetList = container.querySelector("[data-role='snippet-list']");
  const insertBtn = container.querySelector(".insert-snippets");
  const form = container.querySelector(".llm-controls");
  const textarea = form.querySelector("textarea");
  const sendBtn = form.querySelector("button[type='submit']");

  SYSTEM_PROMPTS.forEach((config) => {
    const option = document.createElement("option");
    option.value = config.id;
    option.textContent = config.label;
    systemSelect.appendChild(option);
  });

  const state = {
    history: loadConversation(),
    selected: new Set(),
    snippets: new Map(),
    sending: false,
  };

  const renderMessages = () => {
    messagesEl.innerHTML = "";
    if (!state.history.length) {
      const placeholder = document.createElement("div");
      placeholder.className = "llm-message system";
      placeholder.innerHTML = `<p>Start chatting with the MIFF LLM relay. Attach quest snippets for instant context.</p>`;
      messagesEl.appendChild(placeholder);
      return;
    }

    state.history.forEach((entry) => {
      const bubble = document.createElement("article");
      bubble.className = `llm-message ${entry.role}`;
      const timestamp = new Date(entry.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      bubble.innerHTML = `
        <header>
          <strong>${entry.role === "assistant" ? "LLM" : "You"}</strong>
          <span class="text-muted">${timestamp}</span>
        </header>
        <p>${formatText(entry.content)}</p>
      `;
      if (entry.snippets?.length) {
        const contextBlock = document.createElement("ul");
        contextBlock.className = "llm-context-list";
        entry.snippets.forEach((snippet) => {
          const item = document.createElement("li");
          item.textContent = snippet.slice(0, 160) + (snippet.length > 160 ? "…" : "");
          contextBlock.appendChild(item);
        });
        bubble.appendChild(contextBlock);
      }
      if (entry.meta?.fallback) {
        const note = document.createElement("p");
        note.className = "text-muted";
        note.textContent = "LLM offline — showing fallback copy.";
        bubble.appendChild(note);
      }
      messagesEl.appendChild(bubble);
    });

    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  renderMessages();

  loadSnippets(snippetList, state, contentService, () => {
    updateSnippetButton();
  });

  insertBtn.addEventListener("click", () => {
    const snippets = [...state.selected].map((id) => state.snippets.get(id)?.text).filter(Boolean);
    if (!snippets.length) {
      updateStatus("warn", "Select snippets first");
      return;
    }
    textarea.value = `${snippets.join("\n\n")}\n\n${textarea.value}`.trim();
    textarea.focus();
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (state.sending) return;
    const message = textarea.value.trim();
    if (!message) return;

    const system = findSystemPrompt(systemSelect.value);
    const snippets = [...state.selected].map((id) => state.snippets.get(id)?.text).filter(Boolean);

    const userEntry = {
      role: "user",
      content: message,
      snippets,
      ts: Date.now(),
    };
    state.history.push(userEntry);
    trimHistory(state.history);
    persistConversation(state.history);
    renderMessages();
    textarea.value = "";

    setSending(true);
    updateStatus("warn", "Sending…");

    const response = await llmService.sendChat({
      systemPrompt: system.prompt,
      message,
      snippets,
      history: state.history,
    });

    setSending(false);
    updateStatus(response.ok ? "ok" : "danger", response.ok ? "LLM responded" : "LLM offline (copied prompt)");

    state.history.push({
      role: "assistant",
      content: response.reply || "(no response)",
      meta: { fallback: response.fallback, reason: response.reason },
      ts: Date.now(),
    });
    trimHistory(state.history);
    persistConversation(state.history);
    renderMessages();
  };

  form.addEventListener("submit", handleSubmit);

  updateStatus("warn", "Idle");

  return () => {
    form.removeEventListener("submit", handleSubmit);
  };

  function setSending(next) {
    state.sending = next;
    textarea.disabled = next;
    sendBtn.disabled = next;
    sendBtn.textContent = next ? "Sending…" : "Send";
  }

  function updateStatus(tone, text) {
    statusPill.textContent = text;
    statusPill.className = `status-pill ${tone}`;
  }

  function updateSnippetButton() {
    insertBtn.textContent = state.selected.size ? `Insert selected (${state.selected.size})` : "Insert selected";
  }

  snippetList.addEventListener("change", (event) => {
    if (event.target.matches("input[type='checkbox']")) {
      const id = event.target.value;
      if (event.target.checked) {
        state.selected.add(id);
      } else {
        state.selected.delete(id);
      }
      updateSnippetButton();
    }
  });
}

function loadSnippets(listElement, state, contentService, onReady) {
  listElement.textContent = "Loading snippets…";
  contentService
    .getSnippetOptions()
    .then((snippets) => {
      if (!snippets.length) {
        listElement.textContent = "No snippets available.";
        return;
      }
      state.snippets = new Map(snippets.map((snippet) => [snippet.id, snippet]));
      listElement.innerHTML = "";
      snippets.forEach((snippet) => {
        const wrapper = document.createElement("div");
        wrapper.className = "llm-snippet";
        wrapper.innerHTML = `
          <label>
            <input type="checkbox" value="${snippet.id}" />
            <span>
              <strong>${snippet.type === "quest" ? "Quest" : "Dialogue"}</strong><br />
              ${snippet.label}
            </span>
          </label>
        `;
        listElement.appendChild(wrapper);
      });
      onReady?.();
    })
    .catch((error) => {
      console.error("Failed to load snippets", error);
      listElement.textContent = "Unable to reach content API. Using cached snippets.";
    });
}

function findSystemPrompt(id) {
  return SYSTEM_PROMPTS.find((prompt) => prompt.id === id) ?? SYSTEM_PROMPTS[0];
}

function loadConversation() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to parse LLM history", error);
    return [];
  }
}

function persistConversation(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-40)));
  } catch (error) {
    console.warn("Failed to persist conversation", error);
  }
}

function trimHistory(history) {
  if (history.length > 40) {
    history.splice(0, history.length - 40);
  }
}

function formatText(value = "") {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

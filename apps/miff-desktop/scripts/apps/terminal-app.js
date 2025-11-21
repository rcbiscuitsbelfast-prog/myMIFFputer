const HISTORY_KEY = "miff:terminal-history";
const COMMAND_SUGGESTIONS = [
  "help",
  "list quests",
  "list dialogues",
  "list npcs",
  "inspect npc",
  "inspect quest",
  "clear",
];

export function createTerminalApp({ contentService }) {
  return {
    id: "terminal",
    title: "Lore Console",
    icon: ">_",
    width: 640,
    height: 420,
    mount: (container) => mountTerminal(container, contentService),
  };
}

function mountTerminal(container, contentService) {
  container.innerHTML = `
    <section class="terminal-app">
      <div class="terminal-output" aria-live="polite"></div>
      <form class="terminal-input-row">
        <label for="terminal-input">miff&gt;</label>
        <input id="terminal-input" type="text" autocomplete="off" spellcheck="false" />
      </form>
    </section>
  `;

  const output = container.querySelector(".terminal-output");
  const form = container.querySelector("form");
  const input = container.querySelector("#terminal-input");

  const history = loadHistory();
  let pointer = history.length;

  const printLine = (text = "", variant) => {
    const line = document.createElement("p");
    line.textContent = text;
    if (variant) {
      line.classList.add(variant);
    }
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
  };

  const printBlock = (lines = []) => {
    lines.forEach((line) => printLine(line));
  };

  const intro = [
    "MIFF terminal ready.",
    "Type 'help' for available commands.",
  ];
  printBlock(intro);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const command = input.value.trim();
    if (!command) return;

    printLine(`miff> ${command}`, "command");
    input.value = "";
    history.push(command);
    if (history.length > 60) {
      history.splice(0, history.length - 60);
    }
    pointer = history.length;
    persistHistory(history);

    await handleCommand(command, {
      printLine,
      printBlock,
      contentService,
      clearOutput: () => {
        output.innerHTML = "";
      },
    });
  };

  const handleKeydown = (event) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      pointer = Math.max(0, pointer - 1);
      input.value = history[pointer] ?? "";
      setCaretToEnd(input);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      pointer = Math.min(history.length, pointer + 1);
      input.value = history[pointer] ?? "";
      setCaretToEnd(input);
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      input.value = autocomplete(input.value, (suggestions) => {
        if (suggestions.length > 1) {
          printLine(`suggestions: ${suggestions.join("  ·  ")}`, "system");
        }
      });
    }
  };

  form.addEventListener("submit", handleSubmit);
  input.addEventListener("keydown", handleKeydown);

  return () => {
    form.removeEventListener("submit", handleSubmit);
    input.removeEventListener("keydown", handleKeydown);
  };
}

async function handleCommand(raw, context) {
  const command = raw.toLowerCase();
  const tokens = command.split(/\s+/);
  const { printLine, printBlock, contentService, clearOutput } = context;

  if (command === "help") {
    printBlock([
      "help              Show this menu",
      "list quests       Summaries for available quests",
      "list npcs         Directory of notable characters",
      "list dialogues    Surface memorable dialogue beats",
      "inspect npc <id>  Expand on a specific NPC",
      "inspect quest <id>Dig into quest gating & hooks",
      "clear             Reset the console output",
    ]);
    return;
  }

  if (command === "clear") {
    clearOutput?.();
    return;
  }

  if (tokens[0] === "list") {
    if (!tokens[1]) {
      printLine("Usage: list quests|npcs|dialogues", "system");
      return;
    }
    if (tokens[1] === "quests") {
      const quests = await contentService.listQuests();
      if (!quests.length) {
        printLine("No quests available.", "system");
        return;
      }
      quests.forEach((quest) => {
        printLine(`${formatId(quest.id)} ${quest.title} — ${quest.summary}`);
      });
      return;
    }
    if (tokens[1] === "npcs") {
      const npcs = await contentService.listNpcs();
      if (!npcs.length) {
        printLine("No NPCs registered.", "system");
        return;
      }
      npcs.forEach((npc) => {
        printLine(`${formatId(npc.id)} ${npc.name} · ${npc.role} @ ${npc.location}`);
      });
      return;
    }
    if (tokens[1] === "dialogues") {
      const dialogues = await contentService.listDialogues();
      if (!dialogues.length) {
        printLine("No dialogue snippets yet.", "system");
        return;
      }
      dialogues.forEach((dialogue) => {
        printLine(`${formatId(dialogue.id)} ${dialogue.line}`);
      });
      return;
    }
  }

  if (tokens[0] === "inspect" && tokens[1] === "npc") {
    const id = tokens.slice(2).join(" ");
    if (!id) {
      printLine("Usage: inspect npc <id>", "error");
      return;
    }
    const npc = await contentService.getNpcById(id);
    if (!npc) {
      printLine(`No NPC found for '${id}'`, "error");
      return;
    }
    const dialogues = await contentService.listDialogues();
    const related = dialogues.filter((dialogue) => dialogue.npcId === npc.id);
    printBlock([
      `${npc.name} (${npc.id})`,
      `Role: ${npc.role}`,
      `Location: ${npc.location}`,
      `Temperament: ${npc.temperament ?? "n/a"}`,
      ``,
      "Dialogue hooks:",
      ...related.map((dialogue, index) => `${index + 1}. ${dialogue.line}`),
    ]);
    return;
  }

  if (tokens[0] === "inspect" && tokens[1] === "quest") {
    const id = tokens.slice(2).join(" ");
    if (!id) {
      printLine("Usage: inspect quest <id>", "error");
      return;
    }
    const quest = await contentService.getQuestById(id);
    if (!quest) {
      printLine(`No quest found for '${id}'`, "error");
      return;
    }
    printBlock([
      `${quest.title} (${quest.id})`,
      quest.summary,
      `Reward: ${quest.reward ?? "—"}`,
      `Difficulty: ${quest.difficulty ?? "—"}`,
    ]);
    return;
  }

  printLine(`Unknown command '${raw}'. Type 'help' to see options.`, "error");
}

function autocomplete(value, onSuggestions) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return value;
  const matches = COMMAND_SUGGESTIONS.filter((cmd) => cmd.startsWith(trimmed));
  if (!matches.length) return value;
  if (matches.length === 1) {
    return matches[0] + (matches[0].includes(" ") ? " " : "");
  }
  onSuggestions(matches);
  return value;
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-50) : [];
  } catch (error) {
    console.warn("Failed to parse terminal history", error);
    return [];
  }
}

function persistHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-50)));
  } catch (error) {
    console.warn("Failed to persist terminal history", error);
  }
}

function setCaretToEnd(input) {
  const length = input.value.length;
  requestAnimationFrame(() => {
    input.setSelectionRange(length, length);
  });
}

function formatId(value) {
  return String(value ?? "").padEnd(10, " ");
}

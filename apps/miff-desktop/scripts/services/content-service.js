const FALLBACK_CONTENT = Object.freeze({
  quests: [
    {
      id: "QST-101",
      title: "Archive the Sundial",
      summary: "Recover fractured memory shards from the Sundial Vault and align them with the current star-map.",
      reward: "Sundial Prism",
      difficulty: "Story",
    },
    {
      id: "QST-204",
      title: "Mend the Sky Loom",
      summary: "Re-thread the aurora loom above Miff City before the weaving spirits abandon the skyline.",
      reward: "Sky Loom Pattern",
      difficulty: "Moderate",
    },
    {
      id: "QST-305",
      title: "Tame the Echo Well",
      summary: "Descend beneath the plaza and negotiate with the Echo that is copying citizens without consent.",
      reward: "Echo Glass",
      difficulty: "Challenging",
    },
  ],
  npcs: [
    {
      id: "NPC-AHRI",
      name: "Ahri Sol",
      role: "Quest Cartographer",
      location: "North Archives",
      temperament: "Methodical",
      bio: "Keeps an annotated map of every decision the player base has ever made.",
    },
    {
      id: "NPC-QUIN",
      name: "Quin Mora",
      role: "Synth Bard",
      location: "Heliotrope Plaza",
      temperament: "Chaotic good",
      bio: "Loops improvised choruses to calm volatile echoes.",
    },
    {
      id: "NPC-VERN",
      name: "Vern Kess",
      role: "Memory Smith",
      location: "Underwell Forge",
      temperament: "Stoic",
      bio: "Forges armor out of remembered triumphs.",
    },
  ],
  dialogues: [
    {
      id: "DLG-1A",
      npcId: "NPC-AHRI",
      questId: "QST-101",
      line: "Take only the shards that hum in your palm—the rest belong to forgotten futures.",
    },
    {
      id: "DLG-2B",
      npcId: "NPC-QUIN",
      questId: "QST-204",
      line: "If the loom sings flat, whistle back in threes. Spirits love a callback.",
    },
    {
      id: "DLG-3C",
      npcId: "NPC-VERN",
      questId: "QST-305",
      line: "Echoes bargain with mirrors. Bring one that already knows you.",
    },
  ],
});

export class ContentService {
  constructor({ endpoint = "/api/miff/content", fetchImpl } = {}) {
    this.endpoint = endpoint;
    this.fetchImpl = fetchImpl || (typeof fetch !== "undefined" ? fetch.bind(window) : null);
    this.cache = null;
    this.status = {
      source: "fallback",
      online: false,
      lastUpdated: null,
      error: null,
    };
    this.listeners = new Set();
  }

  async getContent({ forceRefresh = false } = {}) {
    if (this.cache && !forceRefresh) {
      return this.cache;
    }

    return this.#hydrate(forceRefresh);
  }

  async listQuests(options = {}) {
    const data = await this.getContent(options);
    return Array.isArray(data.quests) ? data.quests : [];
  }

  async listNpcs(options = {}) {
    const data = await this.getContent(options);
    return Array.isArray(data.npcs) ? data.npcs : [];
  }

  async listDialogues(options = {}) {
    const data = await this.getContent(options);
    return Array.isArray(data.dialogues) ? data.dialogues : [];
  }

  async getNpcById(id) {
    if (!id) return null;
    const normalized = id.toLowerCase();
    const npcs = await this.listNpcs();
    return npcs.find((npc) => npc.id.toLowerCase() === normalized || npc.name.toLowerCase() === normalized) || null;
  }

  async getQuestById(id) {
    if (!id) return null;
    const normalized = id.toLowerCase();
    const quests = await this.listQuests();
    return quests.find((quest) => quest.id.toLowerCase() === normalized || quest.title.toLowerCase() === normalized) || null;
  }

  async getSnippetOptions() {
    const [quests, dialogues, npcs] = await Promise.all([
      this.listQuests(),
      this.listDialogues(),
      this.listNpcs(),
    ]);

    const questSnippets = quests.map((quest) => ({
      id: `quest-${quest.id}`,
      label: `${quest.id} · ${quest.title}`,
      type: "quest",
      text: `# ${quest.title}\n\n${quest.summary}\n\nReward: ${quest.reward ?? "???"}\nDifficulty: ${quest.difficulty ?? "unknown"}`,
    }));

    const dialogueSnippets = dialogues.map((dialogue) => {
      const npc = npcs.find((entry) => entry.id === dialogue.npcId);
      return {
        id: `dialogue-${dialogue.id}`,
        label: `${npc?.name ?? dialogue.npcId}: ${dialogue.line.slice(0, 42)}${
          dialogue.line.length > 42 ? "…" : ""
        }`,
        type: "dialogue",
        text: `${npc?.name ?? dialogue.npcId}: ${dialogue.line}`,
      };
    });

    return [...questSnippets, ...dialogueSnippets];
  }

  onStatusChange(listener) {
    if (typeof listener !== "function") return () => {};
    this.listeners.add(listener);
    listener({ ...this.status });
    return () => this.listeners.delete(listener);
  }

  #emitStatus() {
    const snapshot = { ...this.status };
    this.listeners.forEach((listener) => listener(snapshot));
  }

  async #hydrate(forceNetwork = false) {
    if (!this.fetchImpl) {
      this.cache = this.cache || structuredCloneSafe(FALLBACK_CONTENT);
      this.status = {
        source: "fallback",
        online: false,
        lastUpdated: this.status.lastUpdated,
        error: "Fetch API unavailable",
      };
      this.#emitStatus();
      return this.cache;
    }

    const useFallback = async (error) => {
      if (!this.cache || forceNetwork) {
        this.cache = structuredCloneSafe(FALLBACK_CONTENT);
      }
      this.status = {
        source: "fallback",
        online: false,
        lastUpdated: this.status.lastUpdated,
        error: error?.message ?? String(error),
      };
      this.#emitStatus();
      return this.cache;
    };

    try {
      const response = await this.fetchImpl(this.endpoint, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`Content service responded with ${response.status}`);
      }
      const payload = await response.json();
      this.cache = normalizeContent(payload);
      this.status = {
        source: "network",
        online: true,
        lastUpdated: new Date().toISOString(),
        error: null,
      };
      this.#emitStatus();
      return this.cache;
    } catch (error) {
      return useFallback(error);
    }
  }
}

function normalizeContent(payload) {
  if (!payload || typeof payload !== "object") {
    return structuredCloneSafe(FALLBACK_CONTENT);
  }

  return {
    quests: Array.isArray(payload.quests) && payload.quests.length ? payload.quests : structuredCloneSafe(FALLBACK_CONTENT.quests),
    npcs: Array.isArray(payload.npcs) && payload.npcs.length ? payload.npcs : structuredCloneSafe(FALLBACK_CONTENT.npcs),
    dialogues:
      Array.isArray(payload.dialogues) && payload.dialogues.length
        ? payload.dialogues
        : structuredCloneSafe(FALLBACK_CONTENT.dialogues),
  };
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

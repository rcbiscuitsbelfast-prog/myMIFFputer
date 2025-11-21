export class LLMService {
  constructor({ endpoint = "/api/miff/llm/chat", fetchImpl } = {}) {
    this.endpoint = endpoint;
    this.fetchImpl = fetchImpl || (typeof fetch !== "undefined" ? fetch.bind(window) : null);
  }

  async sendChat({ systemPrompt, message, snippets = [], history = [] }) {
    const payload = {
      systemPrompt,
      message,
      snippets,
      history,
    };

    if (!this.fetchImpl) {
      return this.#fallback(payload, "Fetch API unavailable in this environment");
    }

    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`LLM backend responded with ${response.status}`);
      }

      const data = await response.json();
      return {
        ok: true,
        reply: data.reply ?? data.message ?? data.content ?? "",
        meta: data.meta ?? null,
        raw: data,
        fallback: false,
      };
    } catch (error) {
      return this.#fallback(payload, error.message);
    }
  }

  #fallback(payload, reason) {
    const composedPrompt = this.#composePrompt(payload);
    return {
      ok: false,
      fallback: true,
      reason,
      reply: `LLM service is not available. You can copy the prompt below into another provider.\n\n${composedPrompt}`,
      prompt: composedPrompt,
    };
  }

  #composePrompt({ systemPrompt, message, snippets, history }) {
    const lines = [];
    if (systemPrompt) {
      lines.push(`System prompt: ${systemPrompt}`);
    }
    if (Array.isArray(snippets) && snippets.length) {
      lines.push("\nContext snippets:");
      snippets.forEach((snippet, index) => {
        lines.push(`${index + 1}. ${snippet}`);
      });
    }
    if (Array.isArray(history) && history.length) {
      lines.push("\nConversation so far:");
      history.slice(-6).forEach((entry) => {
        lines.push(`${entry.role ?? "user"}: ${entry.content}`);
      });
    }
    lines.push("\nUser message:");
    lines.push(String(message ?? ""));
    return lines.join("\n");
  }
}

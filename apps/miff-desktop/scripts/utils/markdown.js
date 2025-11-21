const HEADING_PATTERNS = [
  { regex: /^###\s+(.*)$/i, tag: "h3" },
  { regex: /^##\s+(.*)$/i, tag: "h2" },
  { regex: /^#\s+(.*)$/i, tag: "h1" },
];

export function renderMarkdown(raw = "") {
  const safe = escapeHtml(String(raw));
  const lines = safe.split(/\n/);
  const fragments = [];
  let buffer = [];
  let listOpen = false;

  const flushParagraph = () => {
    if (!buffer.length) return;
    fragments.push(`<p>${applyInline(buffer.join(" "))}</p>`);
    buffer = [];
  };

  lines.forEach((line) => {
    const headingMatch = HEADING_PATTERNS.find(({ regex }) => regex.test(line));
    if (headingMatch) {
      const content = line.replace(headingMatch.regex, "$1");
      flushParagraph();
      if (listOpen) {
        fragments.push("</ul>");
        listOpen = false;
      }
      fragments.push(`<${headingMatch.tag}>${applyInline(content)}</${headingMatch.tag}>`);
      return;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      flushParagraph();
      if (!listOpen) {
        fragments.push("<ul>");
        listOpen = true;
      }
      const item = line.replace(/^\s*[-*]\s+/, "");
      fragments.push(`<li>${applyInline(item)}</li>`);
      return;
    }

    if (!line.trim()) {
      flushParagraph();
      if (listOpen) {
        fragments.push("</ul>");
        listOpen = false;
      }
      return;
    }

    buffer.push(line.trim());
  });

  flushParagraph();
  if (listOpen) {
    fragments.push("</ul>");
  }

  return fragments.join("\n");
}

function applyInline(value) {
  return value
    .replace(/\*\*(.+?)\*\*/gim, "<strong>$1</strong>")
    .replace(/_(.+?)_/gim, "<em>$1</em>")
    .replace(/`([^`]+)`/gim, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/gim, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

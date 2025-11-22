interface Dialogue {
  slug: string;
  npc: string;
  lines: {
    id: string;
    speaker: string;
    text: string;
  }[];
}

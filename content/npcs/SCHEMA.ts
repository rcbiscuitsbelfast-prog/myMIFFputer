interface NPC {
  slug: string;
  name: string;
  description: string;
  role: string;
  location: string;
  attributes: {
    [key: string]: number;
  };
}

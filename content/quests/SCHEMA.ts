interface Quest {
  slug: string;
  title: string;
  description: string;
  objectives: {
    id: string;
    description: string;
  }[];
  rewards: {
    experience: number;
    items: string[];
  };
}

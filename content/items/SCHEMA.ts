interface Item {
  slug: string;
  name: string;
  type: string;
  description: string;
  value: number;
  effects?: {
    [key: string]: any;
  };
}

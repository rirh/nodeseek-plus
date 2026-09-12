export type Value = boolean | string | number;
export type Settings = Record<string, Record<string, Value>>;

export interface Context {
  root: Document;
  get<T = Value>(key: string): T;
  set(key: string, value: unknown): void;
  watch(callback: () => void): () => void;
  request<T>(url: string, options?: RequestInit & { responseType?: "json" | "text" }): Promise<T>;
  notify(message: string): void;
  signal: AbortSignal;
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  group: string;
  defaults: Record<string, Value>;
  fields?: Record<string, {
    label: string;
    type: "text" | "textarea" | "number" | "select" | "color";
    options?: { label: string; value: string }[];
  }>;
  mount(ctx: Context): void | (() => void);
}

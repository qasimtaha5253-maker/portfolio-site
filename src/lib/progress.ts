/**
 * Tiny store for a chapter's scroll progress (0–1). It changes every frame,
 * so visuals subscribe to it directly instead of re-rendering through React.
 */
export interface ProgressStore {
  get(): number;
  set(value: number): void;
  subscribe(listener: (value: number) => void): () => void;
}

export function createProgressStore(): ProgressStore {
  let value = 0;
  const listeners = new Set<(value: number) => void>();
  return {
    get: () => value,
    set(next) {
      if (next === value) return;
      value = next;
      listeners.forEach((listener) => listener(value));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export class SingleFlight {
  readonly #pending = new Map<string, Promise<unknown>>();

  run<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const existing = this.#pending.get(key);
    if (existing !== undefined) return existing as Promise<T>;
    const pending = operation().finally(() => this.#pending.delete(key));
    this.#pending.set(key, pending);
    return pending;
  }

  isPending(key: string): boolean {
    return this.#pending.has(key);
  }
}

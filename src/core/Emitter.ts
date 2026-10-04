// Minimal typed event emitter (Phaser-free so src/core runs under tsx in Node).

type Listener = (...args: any[]) => void;

export class Emitter<Events extends Record<string, unknown[]>> {
  private listeners = new Map<keyof Events, Set<Listener>>();

  on<K extends keyof Events>(event: K, fn: (...args: Events[K]) => void): this {
    let set = this.listeners.get(event);
    if (!set) this.listeners.set(event, (set = new Set()));
    set.add(fn as Listener);
    return this;
  }

  once<K extends keyof Events>(event: K, fn: (...args: Events[K]) => void): this {
    const wrap = (...args: Events[K]) => {
      this.off(event, wrap);
      fn(...args);
    };
    return this.on(event, wrap);
  }

  off<K extends keyof Events>(event: K, fn: (...args: Events[K]) => void): this {
    this.listeners.get(event)?.delete(fn as Listener);
    return this;
  }

  protected emit<K extends keyof Events>(event: K, ...args: Events[K]): void {
    for (const fn of [...(this.listeners.get(event) ?? [])]) fn(...args);
  }
}

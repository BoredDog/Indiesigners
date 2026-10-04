// One browser auto-save slot in localStorage (Blueprint A16, S). Serialisation only; no story logic.

export const SAVE_KEY = 'echoes-of-sorrow.save';
export const SAVE_VERSION = 1;

// Falls back to memory when localStorage is missing or blocked (Node tests, private mode).
const memory = new Map<string, string>();
function storage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    /* blocked */
  }
  return {
    getItem: (k) => memory.get(k) ?? null,
    setItem: (k, v) => void memory.set(k, v),
    removeItem: (k) => void memory.delete(k),
  };
}

export const SaveManager = {
  hasSave(): boolean {
    return this.read() !== null;
  },

  read<T extends { version: number }>(): T | null {
    try {
      const raw = storage().getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as T;
      return data?.version === SAVE_VERSION ? data : null;
    } catch {
      return null;
    }
  },

  write(data: { version: number }): void {
    try {
      storage().setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Save failed', e);
    }
  },

  clear(): void {
    try {
      storage().removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
  },
};

import { useState, useCallback } from "react";

const STORAGE_PREFIX = "recent_inputs_";
const DEFAULT_MAX = 8;

/**
 * Input alanları için son yazılan değerleri localStorage'da tutar.
 * Kullanım: const { recentValues, save, clear } = useRecentInputs("poster_title");
 */
export function useRecentInputs(key: string, max = DEFAULT_MAX) {
  const storageKey = STORAGE_PREFIX + key;

  const read = useCallback((): string[] => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, [storageKey]);

  const [recentValues, setRecentValues] = useState<string[]>(read);

  const save = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const current = read();
    // Aynı değer varsa öne taşı, yoksa başa ekle
    const filtered = current.filter(v => v !== trimmed);
    const updated = [trimmed, ...filtered].slice(0, max);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setRecentValues(updated);
  }, [storageKey, max, read]);

  const clear = useCallback(() => {
    localStorage.removeItem(storageKey);
    setRecentValues([]);
  }, [storageKey]);

  return { recentValues, save, clear };
}

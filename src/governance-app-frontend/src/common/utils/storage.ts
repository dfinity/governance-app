/**
 * Whether the page can use `localStorage`. The browser denies it when the user blocks site data,
 * for example with "Block a site from saving data on your device" in Chrome, and then the property
 * read throws a `SecurityError`.
 */
export const canUseLocalStorage = (): boolean => {
  try {
    return globalThis.localStorage !== undefined;
  } catch {
    return false;
  }
};

/** Reads a `localStorage` entry, or `null` when the browser denies the storage. */
export const getStorageItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

/** Writes a `localStorage` entry. The write is lost when the browser denies the storage. */
export const setStorageItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Denied, or full. The value is not persisted.
  }
};

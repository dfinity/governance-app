import { COMMAND_PALETTE_RECENT_STORAGE_KEY } from '@constants/extra';
import { getStorageItem, setStorageItem } from '@utils/storage';

/**
 * The number of ids that the storage keeps. It is more than the palette shows, so a command that
 * no longer exists does not leave the Recent group short.
 */
const MAX_STORED_COMMANDS = 5;

/** The ids of the commands that the user ran in the command palette, the last one first. */
export const readRecentCommands = (): string[] => {
  const stored = getStorageItem(COMMAND_PALETTE_RECENT_STORAGE_KEY);
  if (stored === null) return [];

  try {
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string').slice(0, MAX_STORED_COMMANDS)
      : [];
  } catch {
    return [];
  }
};

/** Puts the id first, and drops the oldest ids over the limit. */
export const addRecentCommand = (id: string): void => {
  const ids = [id, ...readRecentCommands().filter((recentId) => recentId !== id)];
  setStorageItem(
    COMMAND_PALETTE_RECENT_STORAGE_KEY,
    JSON.stringify(ids.slice(0, MAX_STORED_COMMANDS)),
  );
};

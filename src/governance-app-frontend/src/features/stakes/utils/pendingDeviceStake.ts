import { PENDING_DEVICE_STAKE_STORAGE_KEY } from '@constants/extra';

/**
 * A stake transfer that a Ledger device signed and that the app did not claim yet.
 * The memo and the device principal name the governance sub-account that holds the ICP.
 */
export type PendingDeviceStake = {
  /** The transfer memo, as a decimal string. */
  memo: string;
  /** The amount in ICP, as typed in the wizard. */
  amount: string;
};

type Store = Record<string, PendingDeviceStake>;

const readStorage = (): Store => {
  try {
    const value = localStorage.getItem(PENDING_DEVICE_STAKE_STORAGE_KEY);
    const parsed: unknown = value === null ? {} : JSON.parse(value);

    return typeof parsed === 'object' && parsed !== null ? (parsed as Store) : {};
  } catch {
    return {};
  }
};

// The records written in this page session that the storage did not take. `localStorage` can
// be full or blocked; the session copy still protects against a second transfer until the page
// closes. A successful write empties it, so a newer record from another tab is not hidden.
const session = new Map<string, PendingDeviceStake | null>();

const writeStore = (store: Store): void => {
  try {
    if (Object.keys(store).length === 0) {
      localStorage.removeItem(PENDING_DEVICE_STAKE_STORAGE_KEY);
    } else {
      localStorage.setItem(PENDING_DEVICE_STAKE_STORAGE_KEY, JSON.stringify(store));
    }
    session.clear();
  } catch {
    // Storage can be full or blocked. The session copy keeps the record until the page closes.
  }
};

const readStore = (): Store => {
  const store = readStorage();
  session.forEach((pending, key) => {
    if (pending === null) delete store[key];
    else store[key] = pending;
  });

  return store;
};

/** Every unclaimed stake, by device principal. */
export const readAllPendingDeviceStakes = (): Record<string, PendingDeviceStake> => readStore();

/** The unclaimed stake of the device, if any. */
export const readPendingDeviceStake = (principal: string): PendingDeviceStake | undefined =>
  readStore()[principal];

/** Records a stake transfer until its claim succeeds. One per device. */
export const writePendingDeviceStake = (principal: string, pending: PendingDeviceStake): void => {
  session.set(principal, pending);
  writeStore({ ...readStore(), [principal]: pending });
};

/** Forgets the record of the device when it holds this memo. A newer record stays. */
export const clearPendingDeviceStake = (principal: string, memo: string): void => {
  const store = readStore();
  if (store[principal]?.memo !== memo) return;
  session.set(principal, null);
  delete store[principal];
  writeStore(store);
};

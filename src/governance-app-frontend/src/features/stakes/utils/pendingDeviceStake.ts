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

const readStore = (): Store => {
  try {
    const value = localStorage.getItem(PENDING_DEVICE_STAKE_STORAGE_KEY);
    const parsed: unknown = value === null ? {} : JSON.parse(value);

    return typeof parsed === 'object' && parsed !== null ? (parsed as Store) : {};
  } catch {
    return {};
  }
};

const writeStore = (store: Store): void => {
  try {
    if (Object.keys(store).length === 0) {
      localStorage.removeItem(PENDING_DEVICE_STAKE_STORAGE_KEY);
    } else {
      localStorage.setItem(PENDING_DEVICE_STAKE_STORAGE_KEY, JSON.stringify(store));
    }
  } catch {
    // Storage can be full or blocked. The claim still works in this wizard session.
  }
};

/** Every unclaimed stake, by device principal. */
export const readAllPendingDeviceStakes = (): Record<string, PendingDeviceStake> => readStore();

/** The unclaimed stake of the device, if any. */
export const readPendingDeviceStake = (principal: string): PendingDeviceStake | undefined =>
  readStore()[principal];

/** Records a signed stake transfer until its claim succeeds. One per device. */
export const writePendingDeviceStake = (principal: string, pending: PendingDeviceStake): void =>
  writeStore({ ...readStore(), [principal]: pending });

export const clearPendingDeviceStake = (principal: string): void => {
  const store = readStore();
  delete store[principal];
  writeStore(store);
};

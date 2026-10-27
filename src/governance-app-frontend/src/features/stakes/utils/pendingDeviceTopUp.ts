import { PENDING_DEVICE_TOP_UP_STORAGE_KEY } from '@constants/extra';

/**
 * A top-up that a Ledger device was asked to sign. Until the transfer is confirmed, the record
 * keeps the `createdAt` of the transaction: the device can sign a cancelled transfer late, and
 * the same top-up sent again must be the same ledger transaction. Once the transfer went
 * through, the record waits for the neuron refresh, which is anonymous and needs the neuron id
 * only, so a later pass can run it.
 */
export type PendingDeviceTopUp = {
  /** The neuron id, as a decimal string. */
  neuronId: string;
  /** The amount in ICP, as typed. */
  amount: string;
  /** The `created_at_time` of the transfer, in nanoseconds, as a decimal string. */
  createdAt: string;
  /** True once the ledger confirmed the transfer. The refresh is still pending. */
  transferred: boolean;
};

type Store = Record<string, PendingDeviceTopUp>;

const readStore = (): Store => {
  try {
    const value = localStorage.getItem(PENDING_DEVICE_TOP_UP_STORAGE_KEY);
    const parsed: unknown = value === null ? {} : JSON.parse(value);

    return typeof parsed === 'object' && parsed !== null ? (parsed as Store) : {};
  } catch {
    return {};
  }
};

const writeStore = (store: Store): void => {
  try {
    if (Object.keys(store).length === 0) {
      localStorage.removeItem(PENDING_DEVICE_TOP_UP_STORAGE_KEY);
    } else {
      localStorage.setItem(PENDING_DEVICE_TOP_UP_STORAGE_KEY, JSON.stringify(store));
    }
  } catch {
    // Storage can be full or blocked. The refresh still works in this view.
  }
};

/** Every top-up that waits for its refresh, by the key of the transfer. */
export const readAllPendingDeviceTopUps = (): Record<string, PendingDeviceTopUp> => readStore();

export const readPendingDeviceTopUp = (key: string): PendingDeviceTopUp | undefined =>
  readStore()[key];

/** Records a signed top-up transfer until its refresh succeeds. */
export const writePendingDeviceTopUp = (key: string, pending: PendingDeviceTopUp): void =>
  writeStore({ ...readStore(), [key]: pending });

export const clearPendingDeviceTopUp = (key: string): void => {
  const store = readStore();
  delete store[key];
  writeStore(store);
};

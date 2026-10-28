import { TransactionType } from '@features/account/types';

import { II_SIGNER, type Signer } from '@common/ledger/signer';
import { isWebHidSupported } from '@common/ledger/webhid';

export { TransactionType };

export enum SubAccountDialogMode {
  Create = 'create',
  Rename = 'rename',
}

export enum AccountType {
  Main = 'main',
  Subaccount = 'subaccount',
  HardwareWallet = 'hardwareWallet',
}

export interface AccountMetadata {
  name: string;
  accountId: string;
  type: AccountType;
  subAccount?: Uint8Array | number[];
  /** The principal that controls the account. Set for hardware wallet accounts. */
  principal?: string;
}

export type AccountReady = AccountMetadata & {
  status: 'ready';
  balanceE8s: bigint;
};

export type AccountLoading = AccountMetadata & {
  status: 'loading';
};

export type AccountError = AccountMetadata & {
  status: 'error';
  error: unknown;
};

export type Account = AccountReady | AccountLoading | AccountError;

export function isAccountReady(account: Account): account is AccountReady {
  return account.status === 'ready';
}

/**
 * True when the app can sign a transaction from the account.
 * A Ledger device account signs with the device over WebHID, so it needs a browser with
 * WebHID. The account list holds device accounts only while the `ledgerDevice` feature is on.
 */
export function canSignFromAccount(account: Pick<AccountMetadata, 'type'>): boolean {
  return account.type !== AccountType.HardwareWallet || isWebHidSupported();
}

/** Who signs a transfer from the account: the Ledger device of a device account, else the session. */
export function getAccountSigner(account?: Pick<AccountMetadata, 'type' | 'principal'>): Signer {
  if (account?.type === AccountType.HardwareWallet && account.principal) {
    return { kind: 'ledger', principal: account.principal };
  }

  return II_SIGNER;
}

export interface AccountsState {
  accounts: Account[];
  totalBalanceE8s: bigint;
  hasSubaccounts: boolean;
  mainAccountId?: string;
}

export interface AccountTransaction {
  id: bigint;
  type: TransactionType;
  amountE8s: bigint;
  timestamp: number;
  accountId: string;
  accountName: string;
}

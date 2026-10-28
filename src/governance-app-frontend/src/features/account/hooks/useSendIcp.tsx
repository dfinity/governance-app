import {
  AccountIdentifier,
  type IcpLedgerCanister,
  TransferError,
} from '@icp-sdk/canisters/ledger/icp';
import { decodeIcrcAccount, IcrcTransferError } from '@icp-sdk/canisters/ledger/icrc';
import { nowInBigIntNanoSeconds, toNullable } from '@dfinity/utils';
import { useMutation } from '@tanstack/react-query';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { encodeMemoToIcp, encodeMemoToIcrc1 } from '@features/account/utils/transactionMemo';
import { AnalyticsEvent } from '@features/analytics/events';
import { getAmountRange, getErrorReason } from '@features/analytics/properties';
import { analytics } from '@features/analytics/service';

import { E8Sn } from '@constants/extra';
import { useIcpLedger } from '@hooks/icpLedger/useIcpLedger';
import { useDeviceAction } from '@hooks/useDeviceAction';
import { isValidIcpAddress } from '@utils/address';
import { bigIntMul } from '@utils/bigInt';
import { isCertifiedRejectError } from '@utils/errors';
import { duplicateTransferOf } from '@utils/errors/duplicateTransfer';
import { getIcpLedgerCanister } from '@common/canisters';
import { runOnDevice } from '@common/ledger/deviceQueue';
import { II_SIGNER, type Signer } from '@common/ledger/signer';

export type SendIcpParams = {
  /** An ICP account identifier or an ICRC-1 account. */
  toAccount: string;
  /** The amount in ICP, as typed. */
  amount: string;
  fromSubAccount?: Uint8Array | number[];
  /** The transaction memo, when the feature is on and the user typed one. */
  memo?: string;
  /** Who signs the transfer. The source account decides. Defaults to the Internet Identity session. */
  signer?: Signer;
  /** The entry point and the address book use, for the analytics events. */
  analytics: { variant: string; address_book: 'yes' | 'no' };
};

// The `createdAt` of each unsettled device transfer, by its parameters. A dialog reset or a
// remount does not forget it: the device can sign a cancelled transfer late, and the same
// payment sent again must be the same ledger transaction, not a second one.
const deviceCreatedAt = new Map<string, bigint>();

// The key holds the values the ledger sees, so "1" and "1.0", the memos "7" and "007", an
// absent ICP memo and "0", or a hex account in two cases are one payment.
const deviceTransferKey = ({ toAccount, amount, fromSubAccount, memo, signer }: SendIcpParams) => {
  const isIcp = isValidIcpAddress(toAccount);
  const memoKey = isIcp ? encodeMemoToIcp(memo ?? '0').toString() : (memo ?? '');

  return [
    signer?.kind === 'ledger' ? signer.principal : '',
    isIcp ? toAccount.toLowerCase() : toAccount,
    bigIntMul(E8Sn, Number(amount)).toString(),
    memoKey,
    fromSubAccount?.join(',') ?? '',
  ].join('|');
};

/**
 * Sends ICP to an ICP or ICRC-1 account.
 *
 * The `createdAt` of a failed attempt is kept, so a retry sends the same transaction and the
 * ledger rejects a duplicate instead of a second transfer. A Ledger device account signs on
 * the device, behind the approval dialog that shows the amount and the destination.
 */
export function useSendIcp() {
  const { t } = useTranslation();
  const { canister: ledgerCanister } = useIcpLedger();
  const runDeviceAction = useDeviceAction();

  // Keep the createdAt value for retry purposes (used for deduplication at the ledger level)
  const createdAtRef = useRef<bigint | null>(null);
  const resetCreatedAt = () => {
    createdAtRef.current = null;
  };

  const sendProperties = ({ toAccount, analytics: properties }: SendIcpParams) => ({
    ...properties,
    destination: isValidIcpAddress(toAccount) ? 'icp' : 'icrc1',
  });

  const mutation = useMutation({
    mutationFn: (params: SendIcpParams) => {
      const { toAccount, amount, fromSubAccount, memo, signer = II_SIGNER } = params;
      // Use stored createdAt for retry deduplication, or generate a new one
      const stored =
        signer.kind === 'ledger'
          ? deviceCreatedAt.get(deviceTransferKey(params))
          : createdAtRef.current;
      const createdAt = stored ?? nowInBigIntNanoSeconds();
      if (signer.kind === 'ledger') deviceCreatedAt.set(deviceTransferKey(params), createdAt);
      else createdAtRef.current = createdAt;
      const transferAmount = bigIntMul(E8Sn, Number(amount));
      const subAccountArr = fromSubAccount ? Array.from(fromSubAccount) : undefined;

      const transfer = (canister: IcpLedgerCanister) => {
        if (isValidIcpAddress(toAccount)) {
          return canister.transfer({
            to: AccountIdentifier.fromHex(toAccount),
            amount: transferAmount,
            fromSubAccount: subAccountArr,
            memo: memo !== undefined ? encodeMemoToIcp(memo) : undefined,
            createdAt,
          });
        }

        const { owner, subaccount } = decodeIcrcAccount(toAccount);
        return canister.icrc1Transfer({
          to: { owner, subaccount: toNullable(subaccount) },
          fromSubAccount: subAccountArr ? Uint8Array.from(subAccountArr) : undefined,
          amount: transferAmount,
          icrc1Memo: memo !== undefined ? encodeMemoToIcrc1(memo) : undefined,
          createdAt,
        });
      };

      if (signer.kind !== 'ledger') return transfer(ledgerCanister!);

      return runDeviceAction(
        (signal) =>
          runOnDevice(signer.principal, async () => {
            // A cancelled call that waited in the queue must not prompt the device.
            if (signal.aborted) return;
            const deviceLedger = await getIcpLedgerCanister({ signer });
            if (signal.aborted) return;
            try {
              return await transfer(deviceLedger);
            } catch (error: unknown) {
              // The device signed an earlier attempt after its dialog was cancelled. The ledger
              // holds that transfer, so this attempt is the same payment, done.
              const duplicateOf = duplicateTransferOf(error);
              if (duplicateOf === undefined) throw error;
              return duplicateOf;
            }
          }),
        {
          description: t(($) => $.account.ledgerDevice.approveTransfer),
          detail: (
            <span className="flex flex-col gap-1">
              <span>{t(($) => $.common.inIcp, { value: amount })}</span>
              <span>{toAccount}</span>
            </span>
          ),
        },
      );
    },
    onSuccess: (_, params) => {
      resetCreatedAt();
      deviceCreatedAt.delete(deviceTransferKey(params));
      const properties = {
        ...sendProperties(params),
        amount_range: getAmountRange(Number(params.amount)),
      };
      analytics.event(AnalyticsEvent.AccountSendIcp, properties);
      if (params.signer?.kind === 'ledger') {
        analytics.event(AnalyticsEvent.LedgerDeviceSend, properties);
      }
    },
    onError: (error, params) => {
      // A rejected transfer never reached the ledger: the next attempt is a new transaction.
      // A cancelled approval keeps its createdAt, the device can still sign it.
      if (
        isCertifiedRejectError(error) ||
        error instanceof TransferError ||
        error instanceof IcrcTransferError
      ) {
        resetCreatedAt();
        deviceCreatedAt.delete(deviceTransferKey(params));
      }
      const properties = { ...sendProperties(params), reason: getErrorReason(error) };
      analytics.event(AnalyticsEvent.AccountSendIcpError, properties);
      if (params.signer?.kind === 'ledger') {
        analytics.event(AnalyticsEvent.LedgerDeviceSendError, properties);
      }
    },
  });

  return { ...mutation, resetCreatedAt };
}

import {
  AccountIdentifier,
  type IcpLedgerCanister,
  TransferError,
} from '@icp-sdk/canisters/ledger/icp';
import { decodeIcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
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
    mutationFn: ({
      toAccount,
      amount,
      fromSubAccount,
      memo,
      signer = II_SIGNER,
    }: SendIcpParams) => {
      // Use stored createdAt for retry deduplication, or generate a new one
      const createdAt = createdAtRef.current ?? nowInBigIntNanoSeconds();
      createdAtRef.current = createdAt;
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
            return transfer(deviceLedger);
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
      if (isCertifiedRejectError(error) || error instanceof TransferError) resetCreatedAt();
      const properties = { ...sendProperties(params), reason: getErrorReason(error) };
      analytics.event(AnalyticsEvent.AccountSendIcpError, properties);
      if (params.signer?.kind === 'ledger') {
        analytics.event(AnalyticsEvent.LedgerDeviceSendError, properties);
      }
    },
  });

  return { ...mutation, resetCreatedAt };
}

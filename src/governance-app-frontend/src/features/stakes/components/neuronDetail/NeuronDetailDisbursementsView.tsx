import type { MaturityDisbursement, NeuronInfo } from '@icp-sdk/canisters/nns';
import { nonNullish, secondsToDuration } from '@dfinity/utils';
import { Hourglass, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAccounts } from '@features/accounts/hooks/useAccounts';

import { Alert, AlertDescription } from '@components/Alert';
import { Badge } from '@components/badge';
import { MaturitySymbol } from '@components/MaturitySymbol';
import { E8Sn, MATURITY_DISBURSEMENT_DELAY_SECONDS } from '@constants/extra';
import { useNowInSeconds } from '@hooks/useNowInSeconds';
import { bigIntDiv } from '@utils/bigInt';
import { secondsToDate } from '@utils/date';
import { shortenId } from '@utils/id';
import {
  getMaturityDisbursementDestination,
  getMaturityDisbursementDestinationAccountIdentifier,
  getMaturityDisbursementFinalizeTimestampSeconds,
  getNeuronMaturityDisbursementsInProgress,
  getNeuronMaturityDisbursementsInProgressE8s,
} from '@utils/neuron';
import { formatNumber } from '@utils/numbers';

type Props = {
  neuron: NeuronInfo;
};

export function NeuronDetailDisbursementsView({ neuron }: Props) {
  const { t } = useTranslation();
  const { data: accountsState } = useAccounts();

  const disbursements = getNeuronMaturityDisbursementsInProgress(neuron);
  const totalMaturity = bigIntDiv(getNeuronMaturityDisbursementsInProgressE8s(neuron), E8Sn);

  // Show the account name when the destination is one of the user's own accounts. Own accounts
  // are keyed by ICP account identifier, so match on that form for ICRC-1 destinations too.
  const resolveDestinationLabel = (disbursement: MaturityDisbursement): string => {
    const destination = getMaturityDisbursementDestination(disbursement);
    if (!destination) return t(($) => $.neuronDetailModal.disbursements.unknownDestination);
    const accountIdentifier = getMaturityDisbursementDestinationAccountIdentifier(disbursement);
    const ownAccount = accountsState?.accounts.find((a) => a.accountId === accountIdentifier);
    return ownAccount?.name ?? shortenId(destination, 8);
  };

  return (
    <div className="flex flex-col gap-4" data-testid="neuron-detail-disbursements-view">
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
        <span className="text-[13px] text-muted-foreground">
          {t(($) => $.neuronDetailModal.disbursements.total)}
        </span>
        <div className="flex items-center gap-1 text-[15px]" data-testid="disbursements-total">
          <span className="font-semibold">{formatNumber(totalMaturity)}</span>
          <MaturitySymbol />
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {disbursements.map((disbursement, index) => (
          <DisbursementEntry
            key={`${disbursement.timestampOfDisbursementSeconds ?? index}-${index}`}
            disbursement={disbursement}
            destinationLabel={resolveDestinationLabel(disbursement)}
          />
        ))}
      </ul>

      <Alert variant="info">
        <Info className="h-4 w-4" />
        <AlertDescription>{t(($) => $.neuronDetailModal.disbursements.info)}</AlertDescription>
      </Alert>
    </div>
  );
}

type EntryProps = {
  disbursement: MaturityDisbursement;
  destinationLabel: string;
};

function DisbursementEntry({ disbursement, destinationLabel }: EntryProps) {
  const { t } = useTranslation();

  const amount = bigIntDiv(disbursement.amountE8s ?? 0n, E8Sn);
  const startTimestamp = disbursement.timestampOfDisbursementSeconds;
  const finalizeTimestamp = getMaturityDisbursementFinalizeTimestampSeconds(disbursement);
  const destination = getMaturityDisbursementDestination(disbursement);

  return (
    <li className="flex flex-col gap-3 rounded-lg border p-4" data-testid="disbursement-entry">
      <div className="flex items-start justify-between gap-3">
        <div className="flex shrink-0 flex-col gap-1">
          <span className="text-[13px] whitespace-nowrap text-muted-foreground">
            {t(($) => $.neuronDetailModal.disbursements.amount)}
          </span>
          <div className="flex items-center gap-1 text-lg" data-testid="disbursement-amount">
            <span className="font-semibold">{formatNumber(amount)}</span>
            <MaturitySymbol />
          </div>
        </div>
        <div className="flex min-w-0 flex-col items-end gap-1">
          <span className="text-[13px] text-muted-foreground">
            {t(($) => $.neuronDetailModal.disbursements.to)}
          </span>
          <span
            className="max-w-full truncate text-[15px] font-medium"
            title={destination}
            data-testid="disbursement-destination"
          >
            {destinationLabel}
          </span>
        </div>
      </div>

      {nonNullish(finalizeTimestamp) && (
        <DisbursementCountdown
          startTimestamp={startTimestamp}
          finalizeTimestamp={finalizeTimestamp}
        />
      )}

      <div className="flex justify-between gap-3 text-[12px] text-muted-foreground">
        <span>
          {t(($) => $.neuronDetailModal.disbursements.started)}{' '}
          <span className="text-foreground" data-testid="disbursement-started">
            {formatDisbursementDate(startTimestamp)}
          </span>
        </span>
        <span className="text-right">
          {t(($) => $.neuronDetailModal.disbursements.completes)}{' '}
          <span className="font-medium text-foreground" data-testid="disbursement-completes">
            {formatDisbursementDate(finalizeTimestamp)}
          </span>
        </span>
      </div>
    </li>
  );
}

const formatDisbursementDate = (timestamp: bigint | undefined): string =>
  nonNullish(timestamp) ? secondsToDate(Number(timestamp)) : '-';

type CountdownProps = {
  startTimestamp: bigint | undefined;
  finalizeTimestamp: bigint;
};

// Owns the one-second tick, so only this leaf re-renders while the countdown runs.
function DisbursementCountdown({ startTimestamp, finalizeTimestamp }: CountdownProps) {
  const { t } = useTranslation();
  const now = useNowInSeconds();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const end = Number(finalizeTimestamp);
  const start = nonNullish(startTimestamp)
    ? Number(startTimestamp)
    : end - MATURITY_DISBURSEMENT_DELAY_SECONDS;
  const remainingSeconds = end - now;
  const progress = end > start ? Math.min(1, Math.max(0, (now - start) / (end - start))) : 1;
  const duration = secondsToDuration({
    seconds: BigInt(Math.max(0, remainingSeconds)),
    i18n: t(($) => $.common.durationUnits, { returnObjects: true }),
  });

  return (
    <div className="flex flex-col gap-2.5">
      {remainingSeconds > 0 ? (
        <Badge
          variant="secondary"
          className="gap-1.5 font-normal"
          data-testid="disbursement-time-left"
        >
          <Hourglass className="size-3.5" aria-hidden="true" />
          {t(($) => $.neuronDetailModal.disbursements.arrivesIn, { duration })}
        </Badge>
      ) : (
        <Badge
          role="status"
          variant="secondary"
          className="gap-1.5 font-normal"
          data-testid="disbursement-finalizing"
        >
          <Hourglass className="size-3.5" aria-hidden="true" />
          {t(($) => $.neuronDetailModal.disbursements.finalizing)}
        </Badge>
      )}

      <div
        role="progressbar"
        aria-label={t(($) => $.neuronDetailModal.disbursements.progressAria)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        className="h-1 overflow-hidden rounded-full bg-muted"
        data-testid="disbursement-progress"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-out motion-reduce:transition-none"
          style={{ width: `${isMounted ? progress * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}

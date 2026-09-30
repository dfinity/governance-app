import type { MaturityDisbursement, NeuronInfo } from '@icp-sdk/canisters/nns';
import { nonNullish } from '@dfinity/utils';
import { Hourglass, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useAccounts } from '@features/accounts/hooks/useAccounts';

import { Alert, AlertDescription } from '@components/Alert';
import { MaturitySymbol } from '@components/MaturitySymbol';
import { E8Sn } from '@constants/extra';
import { bigIntDiv } from '@utils/bigInt';
import { formatTimestampToLocalDate } from '@utils/date';
import { shortenId } from '@utils/id';
import {
  getMaturityDisbursementDestination,
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

  // Show the account name when the destination is one of the user's own accounts.
  const resolveDestinationLabel = (destination: string | undefined): string => {
    if (!destination) return t(($) => $.neuronDetailModal.disbursements.unknownDestination);
    const ownAccount = accountsState?.accounts.find((a) => a.accountId === destination);
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
            destinationLabel={resolveDestinationLabel(
              getMaturityDisbursementDestination(disbursement),
            )}
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
  const startedAt = formatTimestampToLocalDate(disbursement.timestampOfDisbursementSeconds);
  const finalizeTimestamp = getMaturityDisbursementFinalizeTimestampSeconds(disbursement);
  const completesAt = formatTimestampToLocalDate(finalizeTimestamp);
  const destination = getMaturityDisbursementDestination(disbursement);

  return (
    <li className="flex gap-3 rounded-lg border p-3" data-testid="disbursement-entry">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Hourglass className="size-4" aria-hidden="true" />
      </div>
      <dl className="grid flex-1 grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
        <dt className="text-muted-foreground">
          {t(($) => $.neuronDetailModal.disbursements.amount)}
        </dt>
        <dd className="flex items-center gap-1 text-right" data-testid="disbursement-amount">
          <span className="ml-auto font-semibold">{formatNumber(amount)}</span>
          <MaturitySymbol />
        </dd>

        <dt className="text-muted-foreground">{t(($) => $.neuronDetailModal.disbursements.to)}</dt>
        <dd
          className="truncate text-right font-medium"
          title={destination}
          data-testid="disbursement-destination"
        >
          {destinationLabel}
        </dd>

        <dt className="text-muted-foreground">
          {t(($) => $.neuronDetailModal.disbursements.started)}
        </dt>
        <dd className="text-right" data-testid="disbursement-started">
          {startedAt}
        </dd>

        <dt className="text-muted-foreground">
          {t(($) => $.neuronDetailModal.disbursements.completes)}
        </dt>
        <dd className="text-right font-medium" data-testid="disbursement-completes">
          {nonNullish(finalizeTimestamp) ? completesAt : '-'}
        </dd>
      </dl>
    </li>
  );
}

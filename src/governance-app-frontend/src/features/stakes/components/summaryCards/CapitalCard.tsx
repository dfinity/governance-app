import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { nonNullish } from '@dfinity/utils';
import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DisburseModal } from '@features/stakes/components/DisburseModal';
import { NeuronStandaloneAction } from '@features/stakes/components/neuronDetail';

import { Card, CardContent } from '@components/Card';
import { SensitiveValue } from '@components/SensitiveValue';
import { Skeleton } from '@components/Skeleton';
import { useIcpPrice } from '@hooks/tickers';
import { useInternetIdentity } from '@hooks/useInternetIdentity';
import {
  getNeuronIsDissolved,
  getNeuronsAggregatedData,
  getNeuronStakeAfterFeesE8s,
  isUserHotkey,
} from '@utils/neuron';
import { formatNumber } from '@utils/numbers';
import { cn } from '@utils/shadcn';

import {
  CARD_ACTION_CHEVRON_CLASS,
  CARD_ACTION_CLASS,
  CLICKABLE_CARD_CLASS,
  CLICKABLE_CARD_HOVER_CLASS,
} from './clickableCard';

type CapitalCardProps = {
  neurons: NeuronInfo[];
};

/**
 * Shows the ICP in all neurons. If dissolved neurons still hold ICP, the card
 * shows that amount, and the whole card opens the disburse flow.
 */
export function CapitalCard({ neurons }: CapitalCardProps) {
  const { t } = useTranslation();
  const { identity } = useInternetIdentity();
  const principalId = identity?.getPrincipal().toText();
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);

  const { icpPrice, formatFiat, isLoading: isIcpPriceLoading } = useIcpPrice();

  const { totalStakedAfterFees: totalStaked } = getNeuronsAggregatedData(neurons);

  const fiatValue = nonNullish(icpPrice) ? totalStaked * icpPrice : null;

  const disbursableNeurons = neurons.filter(
    (neuron) =>
      getNeuronIsDissolved(neuron) &&
      getNeuronStakeAfterFeesE8s(neuron) > 0n &&
      !isUserHotkey({ neuron, principalId }),
  );
  const { totalStakedAfterFees: totalUnlocked } = getNeuronsAggregatedData(disbursableNeurons);
  const hasUnlocked = disbursableNeurons.length > 0;

  const actionClassName = cn(CARD_ACTION_CLASS, 'text-muted-foreground');
  const actionContent = (
    <>
      {t(($) => $.common.disburse)}&nbsp;
      <ChevronRight className={CARD_ACTION_CHEVRON_CLASS} />
    </>
  );

  return (
    <Card
      className={cn(
        'gap-3 py-4 wrap-anywhere',
        hasUnlocked && [CLICKABLE_CARD_CLASS, CLICKABLE_CARD_HOVER_CLASS],
      )}
      data-testid="stakes-summary-capital-card"
    >
      <CardContent>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t(($) => $.neuron.summary.capital)}
        </p>
        {/* The staked total arrives with the neurons, so it never waits on the
            ticker price. Only the fiat line below does. */}
        <p className="text-lg font-semibold text-foreground md:text-2xl">
          <SensitiveValue>
            {t(($) => $.common.inIcp, { value: formatNumber(totalStaked) })}
          </SensitiveValue>
        </p>
        {hasUnlocked ? (
          <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 text-sm text-muted-foreground">
            <p>
              <SensitiveValue size="sm">
                {t(($) => $.neuron.summary.unlocked, { value: formatNumber(totalUnlocked) })}
              </SensitiveValue>
            </p>
            {disbursableNeurons.length === 1 ? (
              <Link
                to="/neurons"
                search={{
                  neuronId: disbursableNeurons[0].neuronId.toString(),
                  action: NeuronStandaloneAction.DisburseIcp,
                }}
                className={actionClassName}
                data-card-action
                data-testid="capital-card-disburse-action"
              >
                {actionContent}
              </Link>
            ) : (
              <button
                type="button"
                className={actionClassName}
                onClick={() => setIsDisburseModalOpen(true)}
                data-card-action
                data-testid="capital-card-disburse-action"
              >
                {actionContent}
              </button>
            )}
          </div>
        ) : (
          <div className="mt-1 text-sm text-muted-foreground">
            {isIcpPriceLoading ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              <p>
                {nonNullish(fiatValue) ? (
                  <SensitiveValue size="sm">
                    {t(($) => $.account.approxFiat, { value: formatFiat(fiatValue) })}
                  </SensitiveValue>
                ) : (
                  '—'
                )}
              </p>
            )}
          </div>
        )}
      </CardContent>

      {disbursableNeurons.length > 1 && (
        <DisburseModal
          neurons={disbursableNeurons}
          isOpen={isDisburseModalOpen}
          onOpenChange={setIsDisburseModalOpen}
          icpOnly
        />
      )}
    </Card>
  );
}

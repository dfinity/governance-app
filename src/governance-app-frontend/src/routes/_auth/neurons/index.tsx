import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';
import { EmptyNeuronsState } from '@features/stakes/components/EmptyNeuronsState';
import { NeuronsList } from '@features/stakes/components/NeuronsList';
import { StakingWizardModal } from '@features/stakes/components/stakingWizard/StakingWizardModal';
import {
  AutomaticVotingCard,
  CapitalCard,
  EarningsCard,
  EngagementCard,
} from '@features/stakes/components/summaryCards';

import { Button } from '@components/button';
import { PageHeader } from '@components/PageHeader';
import { QueryStates } from '@components/QueryStates';
import { E8Sn, ICP_TRANSACTION_FEE } from '@constants/extra';
import { useGovernanceNeurons } from '@hooks/governance';
import { useIcpLedgerAccountBalance } from '@hooks/icpLedger';
import type { CertifiedData } from '@typings/queries';
import { bigIntDiv, stringToBigInt } from '@utils/bigInt';
import { warningNotification } from '@utils/notification';

import i18n from '@/i18n/config';

type NeuronsSearchParams = {
  neuronId?: string;
  action?: string;
  openWizard?: boolean;
};

export const Route = createFileRoute('/_auth/neurons/')({
  validateSearch: (search: Record<string, unknown>): NeuronsSearchParams => ({
    neuronId: typeof search.neuronId === 'string' ? search.neuronId : undefined,
    action: typeof search.action === 'string' ? search.action : undefined,
    openWizard: search.openWizard === 'true' || search.openWizard === true ? true : undefined,
  }),
  component: NeuronsComponent,
  head: () => {
    const title = i18n.t(($) => $.common.head.stakes.title);

    return {
      meta: [{ title }],
    };
  },
  staticData: {
    title: 'common.stakes',
  },
});

function NeuronsComponent() {
  const neuronsQuery = useGovernanceNeurons();
  const { t } = useTranslation();
  const navigate = useNavigate({ from: Route.fullPath });
  const { neuronId: neuronParam, action: actionParam, openWizard } = Route.useSearch();

  const selectedNeuronId = neuronParam ? stringToBigInt(neuronParam) : undefined;

  const handleSelectedNeuronChange = (neuronId: bigint | undefined, action?: string) => {
    navigate({
      search: neuronId ? { neuronId: neuronId.toString(), action } : {},
      resetScroll: false,
      replace: true,
    });
  };

  const { data: balanceValue } = useIcpLedgerAccountBalance();
  const balanceICPs = bigIntDiv(balanceValue?.response || 0n, E8Sn);
  const canStake = balanceICPs > ICP_TRANSACTION_FEE;

  const handleStakingWizardOpenChange = (isOpen: boolean) => {
    navigate({
      search: isOpen ? { openWizard: true } : {},
      replace: true,
    });
    if (isOpen) {
      analytics.event(AnalyticsEvent.StakingOpenWizard);
    }
  };

  const handleOpenStakingWizard = () => {
    if (!canStake) {
      warningNotification({
        description: t(($) => $.stakeWizardModal.errors.cannotStake),
      });
    }
    handleStakingWizardOpenChange(true);
  };

  const hasNeurons = neuronsQuery.isSuccess && (neuronsQuery.data?.response.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      {hasNeurons && (
        <PageHeader
          title={t(($) => $.neuron.title)}
          description={t(($) => $.neuron.description)}
          actions={
            <Button
              onClick={handleOpenStakingWizard}
              data-testid="staking-wizard-trigger-btn"
              className="w-full sm:w-auto"
              size="xl"
            >
              <Plus />
              {t(($) => $.stakeWizardModal.title)}
            </Button>
          }
        />
      )}

      <QueryStates<CertifiedData<NeuronInfo[]>>
        query={neuronsQuery}
        isEmpty={(neurons) => neurons.response.length === 0}
        emptyComponent={<EmptyNeuronsState openStakingWizard={handleOpenStakingWizard} />}
      >
        {(neurons) => (
          <>
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <CapitalCard neurons={neurons.response} />
              <EarningsCard neurons={neurons.response} />
              <EngagementCard neurons={neurons.response} />
              <AutomaticVotingCard neurons={neurons.response} />
            </div>
            <NeuronsList
              onSelectedNeuronChange={handleSelectedNeuronChange}
              selectedNeuronId={selectedNeuronId}
              selectedAction={actionParam}
              neurons={neurons.response}
            />
          </>
        )}
      </QueryStates>

      <StakingWizardModal isOpen={!!openWizard} setIsOpen={handleStakingWizardOpenChange} />
    </div>
  );
}

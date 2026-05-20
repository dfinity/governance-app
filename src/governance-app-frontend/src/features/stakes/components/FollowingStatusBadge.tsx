import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@components/Tooltip';
import { useGovernanceEconomics } from '@hooks/governance/useGovernanceEconomics';
import { getFollowingHealth } from '@utils/neuron';

type Props = {
  neuron: NeuronInfo;
};

/**
 * Compact pill shown on the neuron card when following is decaying or cleared.
 * Renders nothing in the healthy state.
 */
export function FollowingStatusBadge({ neuron }: Props) {
  const { t } = useTranslation();
  const economicsQuery = useGovernanceEconomics();
  const economics = economicsQuery.data?.response?.votingPowerEconomics ?? undefined;
  const health = getFollowingHealth(neuron, economics);

  if (!health || health === 'ok') return null;

  const styles =
    health === 'expired'
      ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400'
      : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400';

  const label =
    health === 'expired'
      ? t(($) => $.neuron.followingStatus.badgeExpired)
      : t(($) => $.neuron.followingStatus.badgeWarning);

  const tooltip =
    health === 'expired'
      ? t(($) => $.neuron.followingStatus.tooltipExpired)
      : t(($) => $.neuron.followingStatus.tooltipWarning);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`flex cursor-help items-center gap-1 rounded-sm border px-2 py-0.5 ${styles}`}
          data-testid={`neuron-following-${health}-badge`}
        >
          <AlertTriangle className="size-3" aria-hidden="true" />
          <span className="text-[11px] font-medium">{label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

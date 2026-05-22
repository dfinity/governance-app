import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { AlertTriangle, Clock, TrendingDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@components/Tooltip';
import { useGovernanceEconomics } from '@hooks/governance/useGovernanceEconomics';
import {
  formatRemainingTime,
  getFollowingHealth,
  getSecondsUntilDecayStarts,
  getSecondsUntilFollowingCleared,
} from '@utils/neuron';

type Props = {
  neuron: NeuronInfo;
};

/**
 * Compact pill shown on the neuron card. Renders nothing in the healthy state.
 * Distinguishes the three non-ok states visually (amber → orange → red) and
 * by icon (Clock → TrendingDown → AlertTriangle) so users can tell apart a
 * "heads up" from "you're already losing rewards" from "your following was
 * cleared" without reading text.
 */
export function FollowingStatusBadge({ neuron }: Props) {
  const { t } = useTranslation();
  const economicsQuery = useGovernanceEconomics();
  const economics = economicsQuery.data?.response?.votingPowerEconomics ?? undefined;
  const health = getFollowingHealth(neuron, economics);

  if (!health || health === 'ok') return null;

  const secondsUntilDecay = getSecondsUntilDecayStarts(neuron, economics);
  const secondsUntilCleared = getSecondsUntilFollowingCleared(neuron, economics);
  const durationI18n = t(($) => $.common.durationUnits, { returnObjects: true });

  let styles: string;
  let Icon: typeof AlertTriangle;
  let label: string;
  let tooltip: string;

  if (health === 'warning') {
    styles =
      'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    Icon = Clock;
    label = t(($) => $.neuron.followingStatus.badgeWarning);
    tooltip = t(($) => $.neuron.followingStatus.tooltipWarning, {
      duration: formatRemainingTime(secondsUntilDecay ?? 0n, durationI18n),
    });
  } else if (health === 'decaying') {
    styles =
      'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    Icon = TrendingDown;
    label = t(($) => $.neuron.followingStatus.badgeDecaying);
    tooltip = t(($) => $.neuron.followingStatus.tooltipDecaying, {
      duration: formatRemainingTime(secondsUntilCleared ?? 0n, durationI18n),
    });
  } else {
    styles =
      'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400';
    Icon = AlertTriangle;
    label = t(($) => $.neuron.followingStatus.badgeExpired);
    tooltip = t(($) => $.neuron.followingStatus.tooltipExpired);
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`flex cursor-help items-center gap-1 rounded-sm border px-2 py-0.5 ${styles}`}
          data-testid={`neuron-following-${health}-badge`}
        >
          <Icon className="size-3" aria-hidden="true" />
          <span className="text-[11px] font-medium">{label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

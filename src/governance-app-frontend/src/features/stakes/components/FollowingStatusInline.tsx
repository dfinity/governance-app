import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { nonNullish } from '@dfinity/utils';
import { AlertTriangle, CheckCircle, Clock, TrendingDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Skeleton } from '@components/Skeleton';
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
 * Compact status indicator for the neuron detail table. Renders inline (icon +
 * label) in all four states. The 'warning', 'decaying' and 'expired' states are
 * also surfaced as a full alert with a CTA at the top of the detail view; this
 * row stays as a quick at-a-glance reference.
 *
 * The tooltip's duration text adapts per state:
 * - ok / warning: how long until voting power starts to decay
 * - decaying: how long until following is cleared
 * - expired: no duration (already past the cliff)
 *
 * Sits in an always-rendered `InfoRow`, so it must never resolve to an empty
 * cell: it shows a skeleton while economics load and an em-dash when the health
 * can't be derived (e.g. a neuron with no refresh timestamp) — matching the APY
 * row's loading/unavailable handling.
 */
export function FollowingStatusInline({ neuron }: Props) {
  const { t } = useTranslation();
  const economicsQuery = useGovernanceEconomics();
  const economics = economicsQuery.data?.response?.votingPowerEconomics ?? undefined;
  const now = new Date();
  const health = getFollowingHealth(neuron, economics, now);

  if (economicsQuery.isLoading) return <Skeleton className="h-5 w-20" />;
  if (!health) return <span className="font-semibold text-muted-foreground">—</span>;

  const durationI18n = t(($) => $.common.durationUnits, { returnObjects: true });

  const { Icon, colorClasses, label, tooltip } = ((): {
    Icon: typeof CheckCircle;
    colorClasses: string;
    label: string;
    tooltip: string;
  } => {
    switch (health) {
      case 'ok': {
        const untilDecay = getSecondsUntilDecayStarts(neuron, economics, now);
        const duration = nonNullish(untilDecay)
          ? formatRemainingTime(untilDecay, durationI18n)
          : '';
        return {
          Icon: CheckCircle,
          colorClasses: 'text-green-700 dark:text-green-400',
          label: t(($) => $.neuron.followingStatus.inlineOk),
          tooltip: t(($) => $.neuron.followingStatus.tooltipOk, { duration }),
        };
      }
      case 'warning': {
        const untilDecay = getSecondsUntilDecayStarts(neuron, economics, now);
        const duration = nonNullish(untilDecay)
          ? formatRemainingTime(untilDecay, durationI18n)
          : '';
        return {
          Icon: Clock,
          colorClasses: 'text-amber-700 dark:text-amber-400',
          label: t(($) => $.neuron.followingStatus.inlineWarning),
          tooltip: t(($) => $.neuron.followingStatus.tooltipWarning, { duration }),
        };
      }
      case 'decaying': {
        const untilCleared = getSecondsUntilFollowingCleared(neuron, economics, now);
        const duration = nonNullish(untilCleared)
          ? formatRemainingTime(untilCleared, durationI18n)
          : '';
        return {
          Icon: TrendingDown,
          colorClasses: 'text-orange-700 dark:text-orange-400',
          label: t(($) => $.neuron.followingStatus.inlineDecaying),
          tooltip: t(($) => $.neuron.followingStatus.tooltipDecaying, { duration }),
        };
      }
      case 'expired':
        return {
          Icon: AlertTriangle,
          colorClasses: 'text-red-700 dark:text-red-400',
          label: t(($) => $.neuron.followingStatus.inlineExpired),
          tooltip: t(($) => $.neuron.followingStatus.tooltipExpired),
        };
      default: {
        const exhaustive: never = health;
        throw new Error(`Unhandled FollowingHealth: ${exhaustive}`);
      }
    }
  })();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={`flex cursor-help items-center gap-1.5 font-semibold ${colorClasses}`}
          data-testid={`neuron-following-status-inline-${health}`}
        >
          <Icon className="size-4" aria-hidden="true" />
          <span>{label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

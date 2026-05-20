import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@components/Tooltip';
import { useGovernanceEconomics } from '@hooks/governance/useGovernanceEconomics';
import {
  formatDissolveDelay,
  getFollowingHealth,
  getSecondsUntilFollowingCleared,
} from '@utils/neuron';

type Props = {
  neuron: NeuronInfo;
};

/**
 * Compact status indicator for the neuron detail table. Renders inline (icon +
 * label) in all three states. The 'warning' and 'expired' states are also
 * surfaced as a full alert with a CTA at the top of the detail view; this row
 * stays as a quick at-a-glance reference.
 */
export function FollowingStatusInline({ neuron }: Props) {
  const { t } = useTranslation();
  const economicsQuery = useGovernanceEconomics();
  const economics = economicsQuery.data?.response?.votingPowerEconomics ?? undefined;
  const now = new Date();
  const health = getFollowingHealth(neuron, economics, now);
  const secondsRemaining = getSecondsUntilFollowingCleared(neuron, economics, now);

  if (!health) return null;

  const durationText =
    secondsRemaining !== undefined && secondsRemaining > 0n
      ? formatDissolveDelay({
          seconds: secondsRemaining,
          i18n: t(($) => $.common.durationUnits, { returnObjects: true }),
        })
      : '';

  const label =
    health === 'expired'
      ? t(($) => $.neuron.followingStatus.inlineExpired)
      : health === 'warning'
        ? t(($) => $.neuron.followingStatus.inlineWarning)
        : t(($) => $.neuron.followingStatus.inlineOk);

  const tooltip =
    health === 'expired'
      ? t(($) => $.neuron.followingStatus.alertDescriptionExpired)
      : health === 'warning'
        ? t(($) => $.neuron.followingStatus.alertDescriptionWarning, { duration: durationText })
        : t(($) => $.neuron.followingStatus.alertDescriptionOk, { duration: durationText });

  const colorClasses =
    health === 'expired'
      ? 'text-red-700 dark:text-red-400'
      : health === 'warning'
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-green-700 dark:text-green-400';

  const Icon = health === 'ok' ? ShieldCheck : AlertTriangle;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`flex cursor-help items-center gap-1.5 font-semibold ${colorClasses}`}
          data-testid={`neuron-following-status-inline-${health}`}
        >
          <Icon className="size-4" aria-hidden="true" />
          <span>{label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

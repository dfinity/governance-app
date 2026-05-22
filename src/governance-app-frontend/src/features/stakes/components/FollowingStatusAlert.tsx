import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { isNullish } from '@dfinity/utils';
import { Link } from '@tanstack/react-router';
import { AlertTriangle, ArrowRight, Clock, Loader2, TrendingDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

import { Alert, AlertDescription, AlertTitle } from '@components/Alert';
import { Button } from '@components/button';
import { useGovernanceEconomics } from '@hooks/governance/useGovernanceEconomics';
import { mapCanisterError } from '@utils/errors';
import {
  formatRemainingTime,
  getFollowingHealth,
  getSecondsUntilDecayStarts,
  getSecondsUntilFollowingCleared,
} from '@utils/neuron';
import { errorNotification, successNotification } from '@utils/notification';

import { useRefreshVotingPower } from '../hooks/useRefreshVotingPower';

type Props = {
  neuron: NeuronInfo;
  isHotkey: boolean;
};

/**
 * Prominent alert with a per-state CTA. Only renders in the 'warning',
 * 'decaying' and 'expired' states — the healthy state is surfaced compactly
 * via `FollowingStatusInline` in the details table instead.
 *
 * State semantics:
 * - warning: voting power still full; preemptive notice. CTA refreshes voting
 *   power (followees stay intact). Duration shown is "time until decay starts".
 * - decaying: voting power is actively decreasing. CTA refreshes voting power
 *   (followees still intact). Duration shown is "time until following cleared".
 * - expired: the protocol already cleared followees. Refreshing alone wouldn't
 *   restore them, so the CTA links to the voting page where the user can set
 *   following back up — that flow refreshes voting power as a side effect.
 *
 * Hotkeys are allowed to call refreshVotingPower (controller is not required),
 * so the warning/decaying buttons are enabled for them too. The expired link
 * is also available since hotkeys can edit followees.
 */
export function FollowingStatusAlert({ neuron, isHotkey }: Props) {
  const { t } = useTranslation();
  const economicsQuery = useGovernanceEconomics();
  const economics = economicsQuery.data?.response?.votingPowerEconomics ?? undefined;
  const now = new Date();
  const health = getFollowingHealth(neuron, economics, now);

  const { mutateAsync, isPending } = useRefreshVotingPower();

  if (!health || health === 'ok') return null;

  const durationI18n = t(($) => $.common.durationUnits, { returnObjects: true });

  let variant: 'warning' | 'danger';
  let Icon: typeof AlertTriangle;
  let title: string;
  let description: string;

  if (health === 'warning') {
    const untilDecay = getSecondsUntilDecayStarts(neuron, economics, now);
    if (isNullish(untilDecay)) return null;
    const duration = formatRemainingTime(untilDecay, durationI18n);
    variant = 'warning';
    Icon = Clock;
    title = t(($) => $.neuron.followingStatus.alertTitleWarning);
    description = t(($) => $.neuron.followingStatus.alertDescriptionWarning, { duration });
  } else if (health === 'decaying') {
    const untilCleared = getSecondsUntilFollowingCleared(neuron, economics, now);
    if (isNullish(untilCleared)) return null;
    const duration = formatRemainingTime(untilCleared, durationI18n);
    variant = 'danger';
    Icon = TrendingDown;
    title = t(($) => $.neuron.followingStatus.alertTitleDecaying);
    description = t(($) => $.neuron.followingStatus.alertDescriptionDecaying, { duration });
  } else {
    variant = 'danger';
    Icon = AlertTriangle;
    title = t(($) => $.neuron.followingStatus.alertTitleExpired);
    description = t(($) => $.neuron.followingStatus.alertDescriptionExpired);
  }

  const handleConfirm = async () => {
    try {
      await mutateAsync({ neuronId: neuron.neuronId });
      analytics.event(AnalyticsEvent.StakingRefreshVotingPower);
      successNotification({
        description: t(($) => $.neuron.followingStatus.success),
      });
    } catch (err) {
      analytics.event(AnalyticsEvent.StakingRefreshVotingPowerError);
      errorNotification({
        description: mapCanisterError(err as Error),
      });
    }
  };

  return (
    <Alert variant={variant} data-testid={`neuron-following-status-${health}`}>
      <Icon className="size-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="gap-3">
        <p>{description}</p>
        {health === 'expired' ? (
          <Button asChild size="sm" variant="destructive" data-testid="set-up-following-btn">
            <Link to="/voting" search={{ manageFollowing: true }}>
              <ArrowRight className="mr-2 size-4" />
              {t(($) => $.neuron.followingStatus.ctaExpired)}
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant={health === 'decaying' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={isPending}
            data-testid="confirm-following-btn"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t(($) => $.neuron.followingStatus.processing)}
              </>
            ) : (
              <>
                <Clock className="mr-2 size-4" />
                {t(($) => $.neuron.followingStatus.cta)}
              </>
            )}
          </Button>
        )}
        {isHotkey && (
          <p className="text-xs opacity-80">{t(($) => $.neuron.followingStatus.hotkeyNote)}</p>
        )}
      </AlertDescription>
    </Alert>
  );
}

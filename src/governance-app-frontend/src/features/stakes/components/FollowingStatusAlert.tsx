import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

import { Alert, AlertDescription, AlertTitle } from '@components/Alert';
import { Button } from '@components/button';
import { useGovernanceEconomics } from '@hooks/governance/useGovernanceEconomics';
import { mapCanisterError } from '@utils/errors';
import {
  formatDissolveDelay,
  getFollowingHealth,
  getSecondsUntilFollowingCleared,
} from '@utils/neuron';
import { errorNotification, successNotification } from '@utils/notification';

import { useRefreshVotingPower } from '../hooks/useRefreshVotingPower';

type Props = {
  neuron: NeuronInfo;
  isHotkey: boolean;
};

/**
 * Prominent alert with a "Confirm following" CTA. Only renders in the
 * 'warning' and 'expired' states — the healthy state is surfaced compactly
 * via `FollowingStatusInline` in the details table instead. Hotkeys are
 * allowed to call refreshVotingPower (controller is not required), so the
 * button is enabled for them too.
 */
export function FollowingStatusAlert({ neuron, isHotkey }: Props) {
  const { t } = useTranslation();
  const economicsQuery = useGovernanceEconomics();
  const economics = economicsQuery.data?.response?.votingPowerEconomics ?? undefined;
  const now = new Date();
  const health = getFollowingHealth(neuron, economics, now);
  const secondsRemaining = getSecondsUntilFollowingCleared(neuron, economics, now);

  const { mutateAsync, isPending } = useRefreshVotingPower();

  if (!health || health === 'ok' || secondsRemaining === undefined) return null;

  const remainingText = formatDissolveDelay({
    seconds: secondsRemaining,
    i18n: t(($) => $.common.durationUnits, { returnObjects: true }),
  });

  const variant: 'warning' | 'danger' = health === 'expired' ? 'danger' : 'warning';

  const title =
    health === 'expired'
      ? t(($) => $.neuron.followingStatus.alertTitleExpired)
      : t(($) => $.neuron.followingStatus.alertTitleWarning);

  const description =
    health === 'expired'
      ? t(($) => $.neuron.followingStatus.alertDescriptionExpired)
      : t(($) => $.neuron.followingStatus.alertDescriptionWarning, { duration: remainingText });

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
      <AlertTriangle className="size-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="gap-3">
        <p>{description}</p>
        <Button
          type="button"
          size="sm"
          variant={health === 'expired' ? 'destructive' : 'default'}
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
        {isHotkey && (
          <p className="text-xs opacity-80">{t(($) => $.neuron.followingStatus.hotkeyNote)}</p>
        )}
      </AlertDescription>
    </Alert>
  );
}

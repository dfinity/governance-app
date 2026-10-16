import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { nonNullish } from '@dfinity/utils';
import { Link } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import {
  AlertTriangle,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock,
  TrendingDown,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useRefreshVotingPowerForNeurons } from '@features/stakes/hooks/useRefreshVotingPowerForNeurons';
import {
  AutomaticVotingPhase,
  getAutomaticVotingStatus,
} from '@features/stakes/utils/getAutomaticVotingStatus';

import { Button } from '@components/button';
import { Card, CardContent } from '@components/Card';
import { Skeleton } from '@components/Skeleton';
import { SkeletonScreen } from '@components/skeletons/SkeletonScreen';
import { Spinner } from '@components/Spinner';
import { MILLISECONDS_IN_SECOND } from '@constants/extra';
import { useGovernanceEconomics } from '@hooks/governance/useGovernanceEconomics';
import { useNowInSeconds } from '@hooks/useNowInSeconds';
import { mapCanisterError } from '@utils/errors';
import { formatRemainingTime } from '@utils/neuron';
import { errorNotification, successNotification } from '@utils/notification';
import { cn } from '@utils/shadcn';

type AutomaticVotingCardProps = {
  neurons: NeuronInfo[];
};

// The phases change on a scale of days, so one tick per minute is enough.
const CLOCK_INTERVAL_MS = 60 * MILLISECONDS_IN_SECOND;

type Tone = 'ok' | 'neutral' | 'warning' | 'danger';
type Action = 'confirm' | 'setUp' | 'selectNeuron' | 'confirmNow';

const ICON_COLOR: Record<Tone, string> = {
  ok: 'text-emerald-600 dark:text-emerald-400',
  neutral: 'text-amber-600 dark:text-amber-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
};

const CARD_TINT: Record<Tone, string> = {
  ok: '',
  neutral: '',
  warning: 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20',
  danger: 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20',
};

/**
 * Shows if the neurons vote automatically, and the main action for the current
 * phase. The card stays quiet while no action is due. It gets a tint and a
 * button when the user must act. See `getAutomaticVotingStatus` for the phases.
 */
export function AutomaticVotingCard({ neurons }: AutomaticVotingCardProps) {
  const { t } = useTranslation();
  const { identity } = useInternetIdentity();
  const economicsQuery = useGovernanceEconomics();
  const economics = economicsQuery.data?.response?.votingPowerEconomics ?? undefined;
  const { mutateAsync, isPending } = useRefreshVotingPowerForNeurons();
  const nowInSeconds = useNowInSeconds(CLOCK_INTERVAL_MS);

  const status = getAutomaticVotingStatus({
    neurons,
    economics,
    principalId: identity?.getPrincipal().toText(),
    now: new Date(nowInSeconds * MILLISECONDS_IN_SECOND),
  });
  const durationI18n = t(($) => $.common.durationUnits, { returnObjects: true });
  const duration = nonNullish(status.secondsLeft)
    ? formatRemainingTime(status.secondsLeft, durationI18n)
    : '';

  const handleConfirm = async () => {
    const neuronIds = status.confirmableNeuronIds;
    try {
      await mutateAsync({ neuronIds });
      successNotification({
        description: t(($) => $.neuron.followingStatus.successAll, {
          neuronCount: neuronIds.length,
        }),
      });
    } catch (err) {
      errorNotification({
        description: mapCanisterError(err as Error),
      });
    }
  };

  const { tone, Icon, title, detail, action } = ((): {
    tone: Tone;
    Icon: typeof CheckCircle2;
    title: string;
    detail?: string;
    action?: Action;
  } => {
    switch (status.phase) {
      case AutomaticVotingPhase.NotSetUp:
        return {
          tone: 'warning',
          Icon: AlertTriangle,
          title: t(($) => $.neuron.summary.automaticVoting.notSetUp),
          detail: t(($) => $.neuron.summary.automaticVoting.notSetUpDetail),
          action: 'setUp',
        };
      case AutomaticVotingPhase.FollowingCleared:
        return {
          tone: 'danger',
          Icon: AlertTriangle,
          title: t(($) => $.neuron.summary.automaticVoting.followingCleared),
          detail: t(($) => $.neuron.summary.automaticVoting.followingClearedDetail),
          action: 'setUp',
        };
      case AutomaticVotingPhase.LosingRewards:
        return {
          tone: 'danger',
          Icon: TrendingDown,
          title: t(($) => $.neuron.summary.automaticVoting.losingRewards),
          detail: t(($) => $.neuron.summary.automaticVoting.losingRewardsDetail, { duration }),
          action: 'confirm',
        };
      case AutomaticVotingPhase.ConfirmSoon:
        return {
          tone: 'warning',
          Icon: Clock,
          title: t(($) => $.neuron.summary.automaticVoting.confirmSoon),
          detail: t(($) => $.neuron.summary.automaticVoting.confirmSoonDetail, { duration }),
          action: 'confirm',
        };
      case AutomaticVotingPhase.Partial:
        return {
          tone: 'neutral',
          Icon: CircleDashed,
          title: t(($) => $.neuron.summary.automaticVoting.partial),
          detail: t(($) => $.neuron.summary.automaticVoting.partialDetail),
          action: 'selectNeuron',
        };
      case AutomaticVotingPhase.Active:
        return {
          tone: 'ok',
          Icon: CheckCircle2,
          title: t(($) => $.neuron.summary.automaticVoting.knownNeuronSelected),
          detail: duration
            ? t(($) => $.neuron.summary.automaticVoting.dueIn, { duration })
            : undefined,
          action: status.confirmableNeuronIds.length > 0 ? 'confirmNow' : undefined,
        };
      default: {
        const exhaustive: never = status.phase;
        throw new Error(`Unhandled AutomaticVotingPhase: ${exhaustive}`);
      }
    }
  })();

  const isLoading = economicsQuery.isLoading;

  return (
    <Card
      className={cn('gap-3 py-4', !isLoading && CARD_TINT[tone])}
      data-testid="stakes-summary-automatic-voting-card"
      data-phase={isLoading ? undefined : status.phase}
    >
      <CardContent>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t(($) => $.neuron.summary.automaticVoting.label)}
        </p>
        {isLoading ? (
          <SkeletonScreen>
            <Skeleton className="h-8 w-32" />
          </SkeletonScreen>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Icon className={cn('size-5 shrink-0 md:size-6', ICON_COLOR[tone])} />
              <span className="text-lg font-semibold text-foreground md:text-2xl">{title}</span>
            </div>
            {detail && <p className="mt-1 text-sm text-muted-foreground">{detail}</p>}

            {status.phase === AutomaticVotingPhase.Active && nonNullish(status.windowRemaining) && (
              <div
                role="progressbar"
                aria-label={t(($) => $.neuron.summary.automaticVoting.dueIn, { duration })}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(status.windowRemaining * 100)}
                className="mt-2 h-1 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${status.windowRemaining * 100}%` }}
                />
              </div>
            )}

            {action === 'confirm' && (
              <Button
                size="sm"
                className="mt-3 w-full"
                onClick={handleConfirm}
                disabled={isPending}
                data-testid="automatic-voting-confirm-btn"
              >
                {isPending ? <Spinner /> : <CheckCheck />}
                {t(($) => $.neuron.summary.automaticVoting.confirm)}
              </Button>
            )}

            {action === 'setUp' && (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="mt-3 w-full"
                data-testid="automatic-voting-set-up-btn"
              >
                <Link to="/voting" search={{ manageFollowing: true }}>
                  {t(($) => $.neuron.summary.automaticVoting.setUp)}
                </Link>
              </Button>
            )}

            {action === 'selectNeuron' && (
              <Link
                to="/voting"
                search={{ manageFollowing: true }}
                className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                data-testid="automatic-voting-select-neuron-link"
              >
                {t(($) => $.neuron.summary.automaticVoting.setupVoting)}
                <ChevronRight className="size-3.5" />
              </Link>
            )}

            {action === 'confirmNow' && (
              <button
                type="button"
                className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                onClick={handleConfirm}
                disabled={isPending}
                data-testid="automatic-voting-confirm-now-btn"
              >
                {isPending && <Spinner className="size-3.5" />}
                {t(($) => $.neuron.summary.automaticVoting.confirmNow)}
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

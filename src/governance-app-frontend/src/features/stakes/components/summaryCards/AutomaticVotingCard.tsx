import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { nonNullish } from '@dfinity/utils';
import { Link } from '@tanstack/react-router';
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

import { Card, CardContent } from '@components/Card';
import { Skeleton } from '@components/Skeleton';
import { SkeletonScreen } from '@components/skeletons/SkeletonScreen';
import { Spinner } from '@components/Spinner';
import { MILLISECONDS_IN_SECOND } from '@constants/extra';
import { useGovernanceEconomics } from '@hooks/governance/useGovernanceEconomics';
import { useInternetIdentity } from '@hooks/useInternetIdentity';
import { useNowInSeconds } from '@hooks/useNowInSeconds';
import { mapCanisterError } from '@utils/errors';
import { formatRemainingTime } from '@utils/neuron';
import { errorNotification, successNotification } from '@utils/notification';
import { cn } from '@utils/shadcn';

import {
  CARD_ACTION_CHECK_CLASS,
  CARD_ACTION_CHEVRON_CLASS,
  CARD_ACTION_CLASS,
  CARD_ACTION_ICON_CLASS,
  CLICKABLE_CARD_CLASS,
  CLICKABLE_CARD_HOVER_CLASS,
} from './clickableCard';

type AutomaticVotingCardProps = {
  neurons: NeuronInfo[];
};

// The phases change on a scale of days, so one tick per minute is enough.
const CLOCK_INTERVAL_MS = 60 * MILLISECONDS_IN_SECOND;

type Tone = 'ok' | 'neutral' | 'warning' | 'danger';
type Action = 'confirm' | 'setUp' | 'selectNeuron';

const TONE_STYLES: Record<
  Tone,
  { icon: string; card: string; hover: string; action: string; bar: string; track: string }
> = {
  ok: {
    icon: 'text-emerald-600 dark:text-emerald-400',
    card: '',
    hover: CLICKABLE_CARD_HOVER_CLASS,
    action: 'text-muted-foreground',
    bar: 'bg-emerald-500',
    track: 'bg-border',
  },
  neutral: {
    icon: 'text-amber-600 dark:text-amber-400',
    card: '',
    hover: CLICKABLE_CARD_HOVER_CLASS,
    action: 'text-muted-foreground',
    bar: 'bg-amber-500',
    track: 'bg-border',
  },
  warning: {
    icon: 'text-amber-600 dark:text-amber-400',
    card: 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20',
    hover: 'hover:border-amber-300 dark:hover:border-amber-800',
    action: 'font-medium text-amber-700 dark:text-amber-400',
    bar: 'bg-amber-500',
    track: 'bg-amber-200 dark:bg-amber-900/50',
  },
  danger: {
    icon: 'text-red-600 dark:text-red-400',
    card: 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20',
    hover: 'hover:border-red-300 dark:hover:border-red-800',
    action: 'font-medium text-red-700 dark:text-red-400',
    bar: 'bg-red-500',
    track: 'bg-red-200 dark:bg-red-900/50',
  },
};

/**
 * Shows if the neurons vote automatically, and the main action for the current
 * phase. The whole card runs the action. The card stays quiet while no action
 * is due, and gets a tint when the user must act. A strip on the bottom edge
 * counts down the time that is left. See `getAutomaticVotingStatus` for the
 * phases.
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

  const { tone, Icon, title, fact, action } = ((): {
    tone: Tone;
    Icon: typeof CheckCircle2;
    title: string;
    fact?: string;
    action?: Action;
  } => {
    switch (status.phase) {
      case AutomaticVotingPhase.NotSetUp:
        return {
          tone: 'warning',
          Icon: AlertTriangle,
          title: t(($) => $.neuron.summary.automaticVoting.notSetUp),
          action: 'setUp',
        };
      case AutomaticVotingPhase.FollowingCleared:
        return {
          tone: 'danger',
          Icon: AlertTriangle,
          title: t(($) => $.neuron.summary.automaticVoting.followingCleared),
          action: 'setUp',
        };
      case AutomaticVotingPhase.LosingRewards:
        return {
          tone: 'danger',
          Icon: TrendingDown,
          title: t(($) => $.neuron.summary.automaticVoting.losingRewards),
          fact: duration
            ? t(($) => $.neuron.summary.automaticVoting.stopsIn, { duration })
            : undefined,
          action: 'confirm',
        };
      case AutomaticVotingPhase.ConfirmSoon:
        return {
          tone: 'warning',
          Icon: Clock,
          title: t(($) => $.neuron.summary.automaticVoting.confirmSoon),
          fact: duration
            ? t(($) => $.neuron.summary.automaticVoting.rewardsDropIn, { duration })
            : undefined,
          action: 'confirm',
        };
      case AutomaticVotingPhase.Partial:
        return {
          tone: 'neutral',
          Icon: CircleDashed,
          title: t(($) => $.neuron.summary.automaticVoting.partial),
          action: 'selectNeuron',
        };
      case AutomaticVotingPhase.Active:
        return {
          tone: 'ok',
          Icon: CheckCircle2,
          title: t(($) => $.neuron.summary.automaticVoting.knownNeuronSelected),
          fact: duration
            ? t(($) => $.neuron.summary.automaticVoting.dueIn, { duration })
            : undefined,
          action: status.confirmableNeuronIds.length > 0 ? 'confirm' : undefined,
        };
      default: {
        const exhaustive: never = status.phase;
        throw new Error(`Unhandled AutomaticVotingPhase: ${exhaustive}`);
      }
    }
  })();

  const isLoading = economicsQuery.isLoading;
  const styles = TONE_STYLES[tone];
  const actionClassName = cn(CARD_ACTION_CLASS, styles.action);

  return (
    <Card
      className={cn(
        'gap-3 overflow-hidden py-4 wrap-anywhere',
        !isLoading && styles.card,
        !isLoading && action && [CLICKABLE_CARD_CLASS, styles.hover],
      )}
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
              <Icon className={cn('size-5 shrink-0 md:size-6', styles.icon)} />
              <span className="text-lg font-semibold text-foreground md:text-2xl">{title}</span>
            </div>

            {(fact || action) && (
              <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 text-sm text-muted-foreground">
                {fact && <p>{fact}</p>}

                {action === 'confirm' && (
                  <button
                    type="button"
                    className={actionClassName}
                    onClick={handleConfirm}
                    disabled={isPending}
                    data-card-action
                    data-testid="automatic-voting-confirm-btn"
                  >
                    {t(($) => $.neuron.summary.automaticVoting.confirm)}&nbsp;
                    {isPending ? (
                      <Spinner className={CARD_ACTION_ICON_CLASS} />
                    ) : (
                      <CheckCheck className={CARD_ACTION_CHECK_CLASS} />
                    )}
                  </button>
                )}

                {(action === 'setUp' || action === 'selectNeuron') && (
                  <Link
                    to="/voting"
                    search={{ manageFollowing: true }}
                    className={actionClassName}
                    data-card-action
                    data-testid={
                      action === 'setUp'
                        ? 'automatic-voting-set-up-btn'
                        : 'automatic-voting-select-neuron-link'
                    }
                  >
                    {action === 'setUp'
                      ? t(($) => $.neuron.summary.automaticVoting.setUp)
                      : t(($) => $.neuron.summary.automaticVoting.setupVoting)}
                    &nbsp;
                    <ChevronRight className={CARD_ACTION_CHEVRON_CLASS} />
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>

      {!isLoading && nonNullish(status.remainingFraction) && (
        <div
          role="progressbar"
          aria-label={fact ?? title}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(status.remainingFraction * 100)}
          className={cn('pointer-events-none absolute inset-x-0 bottom-0 h-0.75', styles.track)}
        >
          <div
            className={cn('h-full', styles.bar)}
            style={{ width: `${status.remainingFraction * 100}%` }}
          />
        </div>
      )}
    </Card>
  );
}

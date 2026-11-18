import { ProposalInfo } from '@icp-sdk/canisters/nns';
import { type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@components/Card';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@components/Chart';
import { Skeleton } from '@components/Skeleton';
import { SkeletonScreen } from '@components/skeletons/SkeletonScreen';
import { MILLISECONDS_IN_SECOND } from '@constants/extra';
import { secondsToDate, secondsToTime } from '@utils/date';
import { formatPercentage } from '@utils/numbers';
import { cn } from '@utils/shadcn';

import { useProposalTallyHistory } from '../hooks/useProposalTallyHistory';
import { getDayTicks, hasTallyHistory, TallyPoint, toTallyChart } from '../tallyHistory';

type Props = {
  proposal: ProposalInfo;
};

const SHARE_TICKS = [0, 0.25, 0.5, 0.75, 1];
const NO_DASH = '5 4';
const CHART_HEIGHT = 'h-45';

// We only support English for now.
const formatDay = (seconds: number) =>
  new Date(seconds * MILLISECONDS_IN_SECOND).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
  });

// A live region, so screen readers read the point that the arrow keys select.
const VotingHistoryTooltipContent = (props: ComponentProps<typeof ChartTooltipContent>) => (
  <div role="status" aria-live="polite">
    <ChartTooltipContent {...props} />
  </div>
);

const LegendItem = ({ label, className }: { label: string; className: string }) => (
  <span className="flex items-center gap-1.5">
    <span aria-hidden className={cn('w-3.5 border-t-2', className)} />
    {label}
  </span>
);

export const ProposalVotingHistory = ({ proposal }: Props) => {
  const { t } = useTranslation();
  const historyQuery = useProposalTallyHistory(proposal);

  if (!hasTallyHistory(proposal) || historyQuery.isError) return null;

  const chart = historyQuery.data
    ? toTallyChart({
        history: historyQuery.data,
        proposal,
        // A poll with unchanged data still updates this, so the held line keeps up.
        readAtSeconds: Math.floor(historyQuery.dataUpdatedAt / MILLISECONDS_IN_SECOND),
      })
    : undefined;
  if (!historyQuery.isPending && chart === undefined) return null;

  const yesLabel = t(($) => $.proposal.yes);
  const noLabel = t(($) => $.proposal.no);
  const chartConfig = {
    yes: {
      label: yesLabel,
      theme: { light: 'var(--color-emerald-800)', dark: 'var(--color-emerald-400)' },
    },
    no: {
      label: noLabel,
      theme: { light: 'var(--color-red-800)', dark: 'var(--color-red-400)' },
    },
  } satisfies ChartConfig;
  const lastIndex = (chart?.points.length ?? 0) - 1;

  return (
    <Card data-testid="proposal-voting-history">
      <CardHeader>
        <CardTitle>{t(($) => $.proposal.votingHistory.title)}</CardTitle>
        <CardAction className="flex gap-3 self-center text-xs text-foreground-secondary">
          <LegendItem label={yesLabel} className="border-emerald-800 dark:border-emerald-400" />
          <LegendItem
            label={noLabel}
            className="border-dashed border-red-800 dark:border-red-400"
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        {chart === undefined ? (
          <SkeletonScreen>
            <Skeleton className={cn(CHART_HEIGHT, 'w-full')} />
          </SkeletonScreen>
        ) : (
          <ChartContainer
            config={chartConfig}
            data-testid="proposal-voting-history-chart"
            className={cn(
              CHART_HEIGHT,
              'aspect-auto w-full [&_.recharts-surface:focus-visible]:outline-2 [&_.recharts-surface:focus-visible]:outline-offset-2 [&_.recharts-surface:focus-visible]:outline-ring/50 [&_.recharts-surface:focus-visible]:outline-solid',
            )}
          >
            <LineChart
              data={chart.points}
              margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
              title={t(($) => $.proposal.votingHistory.chartLabel)}
              accessibilityLayer
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="timestampSeconds"
                type="number"
                domain={[chart.startSeconds, chart.endSeconds]}
                ticks={getDayTicks(chart.startSeconds, chart.endSeconds)}
                interval={0}
                tickFormatter={formatDay}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                domain={[0, 1]}
                ticks={SHARE_TICKS}
                tickFormatter={(share: number) =>
                  formatPercentage(share, { minFraction: 0, maxFraction: 0 })
                }
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <ChartTooltip
                cursor={{ strokeDasharray: '2 2' }}
                isAnimationActive={false}
                content={
                  <VotingHistoryTooltipContent
                    className="min-w-36"
                    labelClassName="text-muted-foreground"
                    labelFormatter={(_, payload) => {
                      const timestampSeconds = (payload[0]?.payload as TallyPoint | undefined)
                        ?.timestampSeconds;
                      return timestampSeconds === undefined
                        ? null
                        : `${secondsToDate(timestampSeconds)}, ${secondsToTime(timestampSeconds)}`;
                    }}
                    formatter={(value, name, item) => (
                      <div className="flex w-full items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-[2px]"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-foreground-secondary">
                          {chartConfig[name as keyof typeof chartConfig]?.label}
                        </span>
                        <span className="ml-auto font-mono font-medium text-foreground tabular-nums">
                          {formatPercentage(Number(value))}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Line
                dataKey="no"
                type="stepAfter"
                stroke="var(--color-no)"
                strokeWidth={2}
                strokeDasharray={NO_DASH}
                dot={false}
                activeDot={{ r: 3 }}
                isAnimationActive={false}
              />
              <Line
                dataKey="yes"
                type="stepAfter"
                stroke="var(--color-yes)"
                strokeWidth={2}
                strokeLinejoin="round"
                // Marks the latest value.
                dot={({ index, cx, cy }) =>
                  index === lastIndex ? (
                    <circle
                      key="latest"
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill="var(--color-yes)"
                      stroke="var(--card)"
                      strokeWidth={2}
                    />
                  ) : (
                    <g key={index} />
                  )
                }
                activeDot={{ r: 3 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

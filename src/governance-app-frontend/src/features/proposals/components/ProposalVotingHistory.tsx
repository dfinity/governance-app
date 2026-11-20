import { ProposalInfo } from '@icp-sdk/canisters/nns';
import { type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts';

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

import { useVotingHistoryChart } from '../hooks/useVotingHistoryChart';
import {
  getDayTicks,
  getShareAxis,
  MAJORITY_SHARE,
  QUORUM_SHARE,
  TallyPoint,
  VOTING_HISTORY_CARD_ID,
} from '../tallyHistory';

type Props = {
  proposal: ProposalInfo;
};

const NO_DASH = '5 4';
const REFERENCE_DASH = '2 3';
const CHART_HEIGHT = 'h-45';

// We only support English for now.
const formatDay = (seconds: number) =>
  new Date(seconds * MILLISECONDS_IN_SECOND).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
  });

type DotProps = { index: number; cx?: number; cy?: number };

// Marks the latest value of a line with a filled dot.
const latestDot =
  (lastIndex: number, fill: string) =>
  ({ index, cx, cy }: DotProps) =>
    index === lastIndex ? (
      <circle key="latest" cx={cx} cy={cy} r={4} fill={fill} stroke="var(--card)" strokeWidth={2} />
    ) : (
      <g key={index} />
    );

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
  const chart = useVotingHistoryChart(proposal);

  if (chart === null) return null;

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
  const points = chart?.points ?? [];
  const lastIndex = points.length - 1;
  const latest = points[lastIndex];
  const shareAxis = getShareAxis(points);
  // The line with more votes paints last, so its dot sits on top when the dots overlap.
  const yesOnTop = (latest?.yes ?? 0) >= (latest?.no ?? 0);
  const yesLine = (
    <Line
      key="yes"
      dataKey="yes"
      type="stepAfter"
      stroke="var(--color-yes)"
      strokeWidth={2}
      strokeLinejoin="round"
      dot={latestDot(lastIndex, 'var(--color-yes)')}
      activeDot={{ r: 3 }}
      isAnimationActive={false}
    />
  );
  const noLine = (
    <Line
      key="no"
      dataKey="no"
      type="stepAfter"
      stroke="var(--color-no)"
      strokeWidth={2}
      strokeDasharray={NO_DASH}
      dot={latestDot(lastIndex, 'var(--color-no)')}
      activeDot={{ r: 3 }}
      isAnimationActive={false}
    />
  );
  const lines = yesOnTop ? [noLine, yesLine] : [yesLine, noLine];
  const referenceLines = [
    // Above its line, so the label stays clear of the date ticks when the line is near the bottom.
    {
      share: QUORUM_SHARE,
      label: t(($) => $.proposal.votingHistory.quorum),
      position: 'insideBottomRight' as const,
    },
    // Below its line, so the label stays inside the plot when the line is the top of the axis.
    {
      share: MAJORITY_SHARE,
      label: t(($) => $.proposal.votingHistory.majority),
      position: 'insideTopRight' as const,
    },
  ].filter(({ share }) => share <= shareAxis.max);

  return (
    <Card
      id={VOTING_HISTORY_CARD_ID}
      data-testid="proposal-voting-history"
      className="scroll-mt-16"
    >
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
                domain={[0, shareAxis.max]}
                ticks={shareAxis.ticks}
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
              {referenceLines.map(({ share, label, position }) => (
                <ReferenceLine
                  key={share}
                  y={share}
                  stroke="var(--icp-fg-secondary)"
                  strokeDasharray={REFERENCE_DASH}
                  label={{
                    value: label,
                    position,
                    fontSize: 11,
                    fill: 'var(--icp-fg-secondary)',
                    // Keeps the label readable where a line passes under it.
                    stroke: 'var(--card)',
                    strokeWidth: 4,
                    strokeLinejoin: 'round',
                    paintOrder: 'stroke',
                  }}
                />
              ))}
              {lines}
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

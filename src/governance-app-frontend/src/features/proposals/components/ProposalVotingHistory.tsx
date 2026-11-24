import { ProposalInfo } from '@icp-sdk/canisters/nns';
import { type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';

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
import {
  getDayTicks,
  getMarkPoints,
  getShareAxis,
  hasTallyHistory,
  MAJORITY_SHARE,
  QUORUM_SHARE,
  TallyPoint,
  toTallyChart,
} from '../tallyHistory';

type Props = {
  proposal: ProposalInfo;
};

const REFERENCE_DASH = '2 3';
const CHART_HEIGHT = 'h-45';
// Lines closer than this share of the axis would put one mark over the other.
const MARK_OVERLAP_RATIO = 0.05;
// The side shift, in pixels, of each of two marks that would overlap.
const MARK_SPREAD = 5;

// We only support English for now.
const formatDay = (seconds: number) =>
  new Date(seconds * MILLISECONDS_IN_SECOND).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
  });

// Yes and No have similar lightness, so a shape tells the lines apart without color.
type MarkerShape = 'circle' | 'square';

type MarkerProps = {
  shape: MarkerShape;
  cx?: number;
  cy?: number;
  // Half the width of the mark.
  size: number;
  fill: string;
  strokeWidth: number;
  testId?: string;
};

const Marker = ({ shape, cx = 0, cy = 0, size, fill, strokeWidth, testId }: MarkerProps) =>
  shape === 'circle' ? (
    <circle
      data-testid={testId}
      cx={cx}
      cy={cy}
      r={size}
      fill={fill}
      stroke="var(--card)"
      strokeWidth={strokeWidth}
    />
  ) : (
    <rect
      data-testid={testId}
      x={cx - size}
      y={cy - size}
      width={size * 2}
      height={size * 2}
      fill={fill}
      stroke="var(--card)"
      strokeWidth={strokeWidth}
    />
  );

type LineKey = 'yes' | 'no';

// Puts the two marks side by side where the lines are too close, so both shapes show.
const getMarkShift = ({
  point,
  key,
  axisMax,
}: {
  point: TallyPoint | undefined;
  key: LineKey;
  axisMax: number;
}): number =>
  point !== undefined && Math.abs(point.yes - point.no) < axisMax * MARK_OVERLAP_RATIO
    ? key === 'yes'
      ? -MARK_SPREAD
      : MARK_SPREAD
    : 0;

type DotProps = { index: number; cx?: number; cy?: number };

// Marks the latest value of a line.
const latestDot =
  ({
    lastIndex,
    shape,
    fill,
    shift,
  }: {
    lastIndex: number;
    shape: MarkerShape;
    fill: string;
    shift: number;
  }) =>
  ({ index, cx, cy }: DotProps) =>
    index === lastIndex ? (
      <Marker
        key="latest"
        testId="voting-history-latest"
        shape={shape}
        cx={cx === undefined ? undefined : cx + shift}
        cy={cy}
        size={4}
        fill={fill}
        strokeWidth={2}
      />
    ) : (
      <g key={index} />
    );

// Marks the point that the pointer or the arrow keys select.
const activeDot =
  ({
    key,
    shape,
    fill,
    axisMax,
  }: {
    key: LineKey;
    shape: MarkerShape;
    fill: string;
    axisMax: number;
  }) =>
  ({ cx, cy, payload }: { cx?: number; cy?: number; payload?: TallyPoint }) => {
    const shift = getMarkShift({ point: payload, key, axisMax });
    return (
      <Marker
        testId={`voting-history-active-${key}`}
        shape={shape}
        cx={cx === undefined ? undefined : cx + shift}
        cy={cy}
        size={3}
        fill={fill}
        strokeWidth={1}
      />
    );
  };

// A live region, so screen readers read the point that the arrow keys select.
const VotingHistoryTooltipContent = (props: ComponentProps<typeof ChartTooltipContent>) => (
  <div role="status" aria-live="polite">
    <ChartTooltipContent {...props} />
  </div>
);

const LegendItem = ({
  label,
  shape,
  className,
}: {
  label: string;
  shape: MarkerShape;
  className: string;
}) => (
  <span className="flex items-center gap-1.5">
    <svg aria-hidden width={18} height={10} className={cn('overflow-visible', className)}>
      <line x1={0} x2={18} y1={5} y2={5} stroke="currentColor" strokeWidth={2} />
      <Marker shape={shape} cx={9} cy={5} size={3.5} fill="currentColor" strokeWidth={0} />
    </svg>
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
  const points = chart?.points ?? [];
  const lastIndex = points.length - 1;
  const latest = points[lastIndex];
  const shareAxis = getShareAxis(points);
  // The line with more votes paints last, so its marker sits on top when the markers overlap.
  const yesOnTop = (latest?.yes ?? 0) >= (latest?.no ?? 0);
  const yesLine = (
    <Line
      key="yes"
      dataKey="yes"
      type="stepAfter"
      stroke="var(--color-yes)"
      strokeWidth={2}
      strokeLinejoin="round"
      dot={latestDot({
        lastIndex,
        shape: 'circle',
        fill: 'var(--color-yes)',
        shift: getMarkShift({ point: latest, key: 'yes', axisMax: shareAxis.max }),
      })}
      activeDot={activeDot({
        key: 'yes',
        shape: 'circle',
        fill: 'var(--color-yes)',
        axisMax: shareAxis.max,
      })}
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
      strokeLinejoin="round"
      dot={latestDot({
        lastIndex,
        shape: 'square',
        fill: 'var(--color-no)',
        shift: getMarkShift({ point: latest, key: 'no', axisMax: shareAxis.max }),
      })}
      activeDot={activeDot({
        key: 'no',
        shape: 'square',
        fill: 'var(--color-no)',
        axisMax: shareAxis.max,
      })}
      isAnimationActive={false}
    />
  );
  const dayTicks = chart === undefined ? [] : getDayTicks(chart.startSeconds, chart.endSeconds);
  // Repeats the shapes along the lines, so each line stays known where the lines meet.
  const markPoints = getMarkPoints(points, dayTicks);
  const lineMarks = (key: LineKey, shape: MarkerShape) =>
    markPoints.map((point) => {
      const shift = getMarkShift({ point, key, axisMax: shareAxis.max });
      return (
        <ReferenceDot
          key={`${key}-${point.timestampSeconds}`}
          x={point.timestampSeconds}
          y={point[key]}
          shape={({ cx, cy }: { cx?: number; cy?: number }) => (
            <Marker
              testId={`voting-history-mark-${key}`}
              shape={shape}
              cx={cx === undefined ? undefined : cx + shift}
              cy={cy}
              size={3}
              fill={`var(--color-${key})`}
              strokeWidth={1.5}
            />
          )}
        />
      );
    });
  const yesMarks = lineMarks('yes', 'circle');
  const noMarks = lineMarks('no', 'square');
  const lines = yesOnTop ? [noLine, yesLine] : [yesLine, noLine];
  const marks = yesOnTop ? [...noMarks, ...yesMarks] : [...yesMarks, ...noMarks];
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
    <Card data-testid="proposal-voting-history">
      <CardHeader>
        <CardTitle>{t(($) => $.proposal.votingHistory.title)}</CardTitle>
        <CardAction className="flex gap-3 self-center text-xs text-foreground-secondary">
          <LegendItem
            label={yesLabel}
            shape="circle"
            className="text-emerald-800 dark:text-emerald-400"
          />
          <LegendItem label={noLabel} shape="square" className="text-red-800 dark:text-red-400" />
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
                ticks={dayTicks}
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
                          className={cn(
                            'size-2.5 shrink-0',
                            name === 'yes' ? 'rounded-full' : 'rounded-[2px]',
                          )}
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
              {marks}
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

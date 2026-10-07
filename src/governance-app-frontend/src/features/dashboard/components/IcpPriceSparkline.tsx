import { type ComponentProps, useId } from 'react';
import { Area, AreaChart, XAxis, YAxis } from 'recharts';

import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@components/Chart';
import { MILLISECONDS_IN_SECOND } from '@constants/extra';
import type { IcpRatePoint } from '@hooks/tickers';
import { formatNumber } from '@utils/numbers';
import { cn } from '@utils/shadcn';

type Props = {
  points: IcpRatePoint[];
  label: string;
  className?: string;
};

// Space under the lowest point, as a share of the price range, so the line stays off the bottom edge.
const BOTTOM_PADDING_RATIO = 0.15;

// We only support English for now.
const formatPointTime = (seconds: number) =>
  new Date(seconds * MILLISECONDS_IN_SECOND).toLocaleString('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

// A live region, so screen readers read the point that the arrow keys select.
const SparklineTooltipContent = (props: ComponentProps<typeof ChartTooltipContent>) => (
  <div role="status" aria-live="polite">
    <ChartTooltipContent {...props} />
  </div>
);

// The line and the fill use `currentColor`, so the parent text color sets the trend color.
export const IcpPriceSparkline = ({ points, label, className }: Props) => {
  const gradientId = useId();
  const prices = points.map(({ usd }) => usd);
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  return (
    <ChartContainer
      config={{}}
      data-testid="icp-price-sparkline"
      className={cn(
        'aspect-auto w-full [&_.recharts-surface:focus-visible]:outline-2 [&_.recharts-surface:focus-visible]:-outline-offset-2 [&_.recharts-surface:focus-visible]:outline-ring/50 [&_.recharts-surface:focus-visible]:outline-solid',
        className,
      )}
    >
      <AreaChart
        data={points}
        margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
        title={label}
        accessibilityLayer
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity={0.25} />
            <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis hide dataKey="timestampSeconds" type="number" domain={['dataMin', 'dataMax']} />
        <YAxis hide domain={[min - (max - min) * BOTTOM_PADDING_RATIO, max]} />
        <ChartTooltip
          cursor={{ strokeDasharray: '2 2' }}
          allowEscapeViewBox={{ x: false, y: true }}
          position={{ y: -52 }}
          wrapperStyle={{ zIndex: 10 }}
          isAnimationActive={false}
          content={
            <SparklineTooltipContent
              hideIndicator
              className="min-w-0 whitespace-nowrap"
              labelClassName="text-muted-foreground"
              labelFormatter={(_, payload) => {
                const timestampSeconds = (payload[0]?.payload as IcpRatePoint | undefined)
                  ?.timestampSeconds;
                return timestampSeconds === undefined ? null : formatPointTime(timestampSeconds);
              }}
              formatter={(value) => (
                <span className="font-mono font-medium text-foreground tabular-nums">
                  ${formatNumber(Number(value))}
                </span>
              )}
            />
          }
        />
        <Area
          dataKey="usd"
          type="monotone"
          stroke="currentColor"
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          activeDot={{ r: 3 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
};

import { Area, AreaChart, YAxis } from 'recharts';

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

// We only support english for now.
const formatPointTime = (seconds: number) =>
  new Date(seconds * MILLISECONDS_IN_SECOND).toLocaleString('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

// The line and the fill use `currentColor`, so the parent text color sets the trend color.
export const IcpPriceSparkline = ({ points, label, className }: Props) => (
  <ChartContainer
    config={{}}
    role="img"
    aria-label={label}
    data-testid="icp-price-sparkline"
    className={cn('aspect-auto h-13 w-full', className)}
  >
    <AreaChart
      data={points}
      margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
      accessibilityLayer={false}
    >
      <YAxis hide domain={['dataMin', 'dataMax']} />
      <ChartTooltip
        cursor={{ strokeDasharray: '2 2' }}
        allowEscapeViewBox={{ x: false, y: true }}
        position={{ y: -52 }}
        wrapperStyle={{ zIndex: 10 }}
        isAnimationActive={false}
        content={
          <ChartTooltipContent
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
        fill="currentColor"
        fillOpacity={0.1}
        activeDot={{ r: 3 }}
        isAnimationActive={false}
      />
    </AreaChart>
  </ChartContainer>
);

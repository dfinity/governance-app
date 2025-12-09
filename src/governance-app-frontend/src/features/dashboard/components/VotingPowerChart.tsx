'use client';

import { TrendingUp } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/common/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/common/ui/chart';

const chartData = [
  { month: 'January', power: 186 },
  { month: 'February', power: 305 },
  { month: 'March', power: 237 },
  { month: 'April', power: 73 },
  { month: 'May', power: 209 },
  { month: 'June', power: 214 },
];

const chartConfig = {
  power: {
    label: 'Power',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

export function VotingPowerChart() {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Voting Power History</CardTitle>
        <CardDescription>Showing total voting power for the last 6 months</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="max-h-[250px] w-full">
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
            <Area
              dataKey="power"
              type="natural"
              fill="var(--color-power)"
              fillOpacity={0.4}
              stroke="var(--color-power)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 leading-none font-medium">
              Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 leading-none text-muted-foreground">
              January - June 2024
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

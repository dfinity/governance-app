import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { Card } from '@components/Card';
import { Skeleton } from '@components/Skeleton';
import { SkeletonScreen } from '@components/skeletons/SkeletonScreen';
import { ToggleGroup, ToggleGroupItem } from '@components/ToggleGroup';
import { useFiatCurrency } from '@hooks/useFiatCurrency';

import { useYearSummary } from '../hooks/useYearSummary';
import { getSummaryYears } from '../utils/yearSummary';
import { YearSummaryContent } from './YearSummaryContent';

export const YearSummarySection = () => {
  const { t } = useTranslation();
  const titleId = useId();
  const [years] = useState(() => getSummaryYears(Date.now()));
  const [year, setYear] = useState(years[0]);
  const { fiatCurrency } = useFiatCurrency();
  const summary = useYearSummary(year);

  return (
    <section className="flex flex-col gap-4" aria-labelledby={titleId}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <h2 id={titleId} className="text-2xl font-normal">
            {t(($) => $.reports.yearSummary.title)}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(($) => $.reports.yearSummary.subtitle, { currency: fiatCurrency })}
          </p>
        </div>
        <ToggleGroup
          type="single"
          spacing={0.5}
          value={String(year)}
          onValueChange={(value: string) => {
            if (value) setYear(Number(value));
          }}
          aria-label={t(($) => $.reports.yearSummary.year)}
          className="rounded-md bg-muted p-1"
          data-testid="year-summary-years"
        >
          {years.map((value, index) => (
            <ToggleGroupItem
              key={value}
              value={String(value)}
              className="h-8 px-3 text-sm text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-xs"
            >
              {index === 0
                ? t(($) => $.reports.yearSummary.yearToDate, { year: value })
                : String(value)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <Card className="gap-0 p-6" data-testid="year-summary-card">
        {summary.isPending ? (
          <YearSummarySkeleton />
        ) : summary.isError ? (
          <div className="flex flex-col items-start gap-3" role="alert">
            <p className="text-sm text-muted-foreground">{t(($) => $.reports.yearSummary.error)}</p>
            <Button variant="outline" size="sm" onClick={() => summary.refetch()}>
              {t(($) => $.common.retry)}
            </Button>
          </div>
        ) : (
          <YearSummaryContent
            summary={summary.data}
            currency={fiatCurrency}
            sectionTitleId={titleId}
          />
        )}
      </Card>
    </section>
  );
};

const YearSummarySkeleton = () => (
  <SkeletonScreen className="flex flex-col gap-5">
    <div className="grid gap-3 sm:grid-cols-3">
      {[0, 1, 2].map((index) => (
        <Skeleton key={index} className="h-[92px]" />
      ))}
    </div>
    <div className="flex flex-col gap-3">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
    </div>
  </SkeletonScreen>
);

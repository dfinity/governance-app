import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { NeuronsReportRow } from '@features/reports/components/NeuronsReportRow';
import { TransactionsReportRow } from '@features/reports/components/TransactionsReportRow';
import { YearSummarySection } from '@features/reports/components/YearSummarySection';

import { Card } from '@components/Card';
import { PageHeader } from '@components/PageHeader';

import i18n from '@/i18n/config';

export const Route = createFileRoute('/_auth/reports/')({
  component: ReportsPage,
  head: () => {
    const title = i18n.t(($) => $.common.head.reports.title);

    return {
      meta: [{ title }],
    };
  },
  staticData: {
    title: 'reports.title',
  },
});

function ReportsPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-full flex-col gap-12">
      <PageHeader title={t(($) => $.reports.title)} description={t(($) => $.reports.description)} />

      <YearSummarySection />

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-normal">{t(($) => $.reports.exports)}</h2>
        <Card className="overflow-hidden p-0">
          <div className="flex flex-col divide-y">
            <div className="px-6 py-5">
              <NeuronsReportRow />
            </div>
            <div className="px-6 py-5">
              <TransactionsReportRow />
            </div>
          </div>
        </Card>
      </section>

      <p className="mt-auto text-center text-xs text-muted-foreground">
        {t(($) => $.reports.footnote)}
      </p>
    </div>
  );
}

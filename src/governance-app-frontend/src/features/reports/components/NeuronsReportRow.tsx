import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { useIcpPrice } from '@hooks/tickers/useIcpPrice';

import { useNeuronsReportDownload } from '../hooks/useReportDownloads';
import { ReportDownloadButton } from './ReportDownloadButton';

export const NeuronsReportRow = () => {
  const { t } = useTranslation();
  const titleId = useId();
  const download = useNeuronsReportDownload();
  // The file takes the price at the click, so the button waits for the price to load.
  const { isLoading: isPriceLoading } = useIcpPrice();

  return (
    <div
      className="flex flex-col gap-y-4 md:flex-row md:items-center md:justify-between md:gap-x-6"
      data-testid="neurons-report-row"
    >
      <div className="space-y-1">
        <p id={titleId} className="leading-none font-medium">
          {t(($) => $.reports.neurons.title)}
        </p>
        <p className="text-sm text-muted-foreground">{t(($) => $.reports.neurons.description)}</p>
      </div>
      <ReportDownloadButton
        titleId={titleId}
        onClick={() => download.mutate()}
        isPending={download.isPending || isPriceLoading}
        testId="neurons-report-download-btn"
      />
    </div>
  );
};

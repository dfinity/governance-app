import { useTranslation } from 'react-i18next';

import { useNeuronsReportDownload } from '../hooks/useReportDownloads';
import { ReportDownloadButton } from './ReportDownloadButton';

export const NeuronsReportRow = () => {
  const { t } = useTranslation();
  const download = useNeuronsReportDownload();

  return (
    <div
      className="flex flex-col gap-y-4 md:flex-row md:items-center md:justify-between md:gap-x-6"
      data-testid="neurons-report-row"
    >
      <div className="space-y-1">
        <p className="leading-none font-medium">{t(($) => $.reports.neurons.title)}</p>
        <p className="text-sm text-muted-foreground">{t(($) => $.reports.neurons.description)}</p>
      </div>
      <ReportDownloadButton
        onClick={() => download.mutate()}
        isPending={download.isPending}
        testId="neurons-report-download-btn"
      />
    </div>
  );
};

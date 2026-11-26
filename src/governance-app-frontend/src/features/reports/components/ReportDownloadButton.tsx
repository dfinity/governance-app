import { Download } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { Spinner } from '@components/Spinner';

type Props = {
  /** The ID of the report title, which completes the accessible name of the button. */
  titleId: string;
  onClick: () => void;
  isPending: boolean;
  testId: string;
};

export const ReportDownloadButton = ({ titleId, onClick, isPending, testId }: Props) => {
  const { t } = useTranslation();
  const labelId = useId();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={isPending}
      aria-busy={isPending}
      aria-labelledby={`${labelId} ${titleId}`}
      className="w-full md:w-auto"
      data-testid={testId}
    >
      {isPending ? <Spinner /> : <Download />}
      <span id={labelId}>{t(($) => $.reports.download)}</span>
    </Button>
  );
};

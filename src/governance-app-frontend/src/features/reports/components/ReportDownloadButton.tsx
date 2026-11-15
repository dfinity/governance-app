import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { Spinner } from '@components/Spinner';

type Props = {
  onClick: () => void;
  isPending: boolean;
  testId: string;
};

export const ReportDownloadButton = ({ onClick, isPending, testId }: Props) => {
  const { t } = useTranslation();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={isPending}
      aria-busy={isPending}
      className="w-full md:w-auto"
      data-testid={testId}
    >
      {isPending ? <Spinner /> : <Download />}
      {t(($) => $.reports.download)}
    </Button>
  );
};

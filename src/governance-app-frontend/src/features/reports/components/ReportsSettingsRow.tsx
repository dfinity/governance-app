import { Link } from '@tanstack/react-router';
import { FileSpreadsheet } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';

export const ReportsSettingsRow = () => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between gap-4" data-testid="reports-settings-row">
      <div className="flex items-center gap-3">
        <FileSpreadsheet className="size-5 shrink-0 text-muted-foreground" />
        <div className="space-y-0.5">
          <p className="font-medium">{t(($) => $.reports.title)}</p>
          <p className="text-sm text-muted-foreground">
            {t(($) => $.reports.settingsRow.description)}
          </p>
        </div>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link to="/reports" data-testid="reports-settings-open-link">
          {t(($) => $.reports.settingsRow.open)}
        </Link>
      </Button>
    </div>
  );
};

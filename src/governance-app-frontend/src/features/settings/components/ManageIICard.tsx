import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent } from '@components/Card';
import { IDENTITY_PROVIDER } from '@constants/extra';

export const ManageIICard = () => {
  const { t } = useTranslation();

  return (
    <a
      href={`${IDENTITY_PROVIDER}/login`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t(($) => $.settings.aria.iiLink)}
    >
      <Card className="rounded-md px-4 py-6">
        <CardContent className="p-0">
          <div className="flex items-center justify-between">
            <p className="leading-none font-medium">{t(($) => $.settings.manageII)}</p>
            <ExternalLink className="size-5 text-muted-foreground" aria-hidden="true" />
          </div>
        </CardContent>
      </Card>
    </a>
  );
};

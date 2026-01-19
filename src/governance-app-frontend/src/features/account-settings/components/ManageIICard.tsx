import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { IDENTITY_PROVIDER } from '@constants/extra';

export const ManageIICard = () => {
  const { t } = useTranslation();

  return (
    <a
      href={`${IDENTITY_PROVIDER}/login`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t(($) => $.accountSettings.aria.iiLink)}
      className="flex items-center justify-between transition-opacity hover:opacity-90"
    >
      <p className="font-medium text-foreground">{t(($) => $.accountSettings.manageII)}</p>
      <ExternalLink className="size-5 text-muted-foreground" aria-hidden="true" />
    </a>
  );
};

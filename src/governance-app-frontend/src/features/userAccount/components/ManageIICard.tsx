import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { II_MANAGE_URL } from '@constants/extra';

export const ManageIICard = () => {
  const { t } = useTranslation();

  return (
    <a
      href={II_MANAGE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t(($) => $.userAccount.aria.iiLink)}
      className="flex items-center justify-between transition-opacity hover:opacity-90"
    >
      <p className="font-medium text-foreground">{t(($) => $.userAccount.manageII)}</p>
      <ExternalLink className="size-5 text-muted-foreground" aria-hidden="true" />
    </a>
  );
};

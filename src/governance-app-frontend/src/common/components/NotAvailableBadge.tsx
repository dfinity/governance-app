import { useTranslation } from 'react-i18next';

import { Badge } from '@components/badge';

export const NotAvailableBadge = () => {
  const { t } = useTranslation();

  return (
    <Badge variant="warning" className="inline">
      {t(($) => $.common.notAvailable)}
    </Badge>
  );
};

import { useTranslation } from 'react-i18next';

import { Badge } from '@ui';

export const NotAvailableBadge = () => {
  const { t } = useTranslation();

  return (
    <Badge type="color" color="warning" size="sm" className="inline">
      {t(($) => $.common.notAvailable)}
    </Badge>
  );
};

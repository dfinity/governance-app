import { useTranslation } from 'react-i18next';

import { Badge } from '@untitledui/components';

export const NotAvailableBadge = () => {
  const { t } = useTranslation();

  return (
    <Badge type="color" color="warning" size="sm" className="inline">
      {t(($) => $.common.NotAvailable)}
    </Badge>
  );
};

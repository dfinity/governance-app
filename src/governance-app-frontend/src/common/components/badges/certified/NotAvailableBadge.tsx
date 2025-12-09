import { useTranslation } from 'react-i18next';

import { Badge } from '@/common/ui/badge';

export const NotAvailableBadge = () => {
  const { t } = useTranslation();

  return (
    <Badge variant="warning" className="inline">
      {t(($) => $.common.notAvailable)}
    </Badge>
  );
};

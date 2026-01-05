import { CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';

export const BuyIcpsButton = () => {
  const { t } = useTranslation();

  return (
    <Button size="lg" className="w-full" disabled>
      <CreditCard /> {t(($) => $.account.buyIcp)}
    </Button>
  );
};

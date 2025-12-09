import { useTranslation } from 'react-i18next';

import { Badge } from '@/common/ui/badge';

type Props = {
  certified?: boolean;
};

export const CertifiedBadge = ({ certified = true }: Props) => {
  const { t } = useTranslation();

  return (
    <Badge variant={certified ? 'success' : 'destructive'} className="text-xs">
      <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${certified ? 'bg-white' : 'bg-red-400'}`} />
      {t(($) => (certified ? $.common.certified : $.common.uncertified))}
    </Badge>
  );
};

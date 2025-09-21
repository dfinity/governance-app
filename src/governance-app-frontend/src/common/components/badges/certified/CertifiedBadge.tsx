import { useTranslation } from 'react-i18next';

import { BadgeWithDot } from '@untitledui/components';

type Props = {
  certified?: boolean;
};
export const CertifiedBadge = ({ certified = true }: Props) => {
  const { t } = useTranslation();

  return (
    <BadgeWithDot color={certified ? 'success' : 'error'} className="text-xs">
      {t(($) => (certified ? $.common.certified : $.common.uncertified))}
    </BadgeWithDot>
  );
};

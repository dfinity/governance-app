import { Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function MaxRewardsBadge() {
  const { t } = useTranslation();

  return (
    <span className="inline-flex items-center gap-1 rounded bg-green-600 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white uppercase shadow-sm">
      <Award className="h-3 w-3" />
      {t(($) => $.common.maxRewards)}
    </span>
  );
}

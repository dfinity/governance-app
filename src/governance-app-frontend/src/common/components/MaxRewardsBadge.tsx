import { Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function MaxRewardsBadge() {
  const { t } = useTranslation();

  return (
    <span className="inline-flex items-center gap-1 rounded-[3px] bg-primary px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-primary-foreground uppercase">
      <Award className="h-3 w-3" />
      {t(($) => $.common.maxRewards)}
    </span>
  );
}

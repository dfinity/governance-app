import { useTranslation } from 'react-i18next';

export const CertifiedBadge = () => {
  const { t } = useTranslation();

  return (
    <span className="flex shrink-0 items-center rounded-md bg-green-200 px-2 py-1 text-xs font-bold text-green-900 uppercase">
      ✅ {t(($) => $.common.certified)}
    </span>
  );
};

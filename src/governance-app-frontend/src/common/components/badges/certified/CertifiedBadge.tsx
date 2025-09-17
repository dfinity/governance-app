import { useTranslation } from 'react-i18next';

export const CertifiedBadge = () => {
  const { t } = useTranslation();

  return (
    <span className="bg-green-200 text-green-900 font-bold text-xs uppercase px-2 py-1 rounded-md flex items-center shrink-0">
      ✅ {t(($) => $.common.certified)}
    </span>
  );
};

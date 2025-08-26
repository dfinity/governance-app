import { useTranslation } from 'react-i18next';

export const CertifiedBadge = () => {
  const { t } = useTranslation();

  return (
    <span className="bg-green-200 text-green-900 font-bold text-sm uppercase px-2 py-1 rounded">
      ✅ {t(($) => $.common.certified)}
    </span>
  );
};

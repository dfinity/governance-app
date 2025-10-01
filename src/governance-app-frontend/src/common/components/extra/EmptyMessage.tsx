import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Props = {
  message?: string | null;
};

export const EmptyMessage = ({ message }: Props) => {
  const { t } = useTranslation();

  return (
    <p className="flex items-center gap-1 text-sm font-bold text-blue-600">
      <AlertCircle className="inline" size={16} /> {message || t(($) => $.common.noData)}
    </p>
  );
};

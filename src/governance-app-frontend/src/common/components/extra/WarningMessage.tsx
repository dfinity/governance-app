import { AlertCircle } from 'lucide-react';

import { cx } from '@untitledui/utils/cx';

type Props = {
  message: string;
  className?: string;
};

export const WarningMessage = ({ message, className }: Props) => (
  <p className={cx('flex items-center gap-1 text-sm font-bold text-orange-600', className)}>
    <AlertCircle className="inline" size={16} /> {message}
  </p>
);

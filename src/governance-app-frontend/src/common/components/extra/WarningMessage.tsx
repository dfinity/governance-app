import { AlertCircle } from 'lucide-react';

type Props = {
  message: string;
};

export const WarningMessage = ({ message }: Props) => (
  <p className="flex items-center gap-1 text-sm font-bold text-orange-600">
    <AlertCircle className="inline" size={16} /> {message}
  </p>
);

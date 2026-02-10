import { cn } from '@utils/shadcn';
import { CheckCircle, Lock, Timer } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Props = {
  isDissolved: boolean;
  isDissolving: boolean;
};

export function NeuronStateBadge({ isDissolved, isDissolving }: Props) {
  const { t } = useTranslation();

  const Icon = isDissolved ? CheckCircle : isDissolving ? Timer : Lock;

  const text = isDissolved
    ? t(($) => $.neuron.dissolved)
    : isDissolving
      ? t(($) => $.neuron.dissolving)
      : t(($) => $.neuron.locked);

  const colorClasses = isDissolving
    ? 'border-orange-200 bg-orange-100 text-orange-700 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
    : 'border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-800 dark:bg-gray-900/30 dark:text-gray-400';

  return (
    <div
      className={cn('flex items-center gap-1 rounded-sm border px-2 py-0.5', colorClasses)}
      data-testid="neuron-state-badge"
    >
      <Icon className="size-3" aria-hidden="true" />
      <span className="sr-only">{text}</span>
      <span className="hidden text-[11px] font-medium md:inline" aria-hidden="true">
        {text}
      </span>
    </div>
  );
}

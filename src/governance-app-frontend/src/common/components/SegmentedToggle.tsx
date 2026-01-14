import { cn } from '@utils/shadcn';

export type SegmentedToggleValue = 'left' | 'right';

type Props = {
  value?: SegmentedToggleValue;
  onValueChange: (value: SegmentedToggleValue) => void;
  leftLabel: string;
  rightLabel: string;
  leftSubLabel?: React.ReactNode;
  rightSubLabel?: React.ReactNode;
  highlightedValue?: SegmentedToggleValue;
  className?: string;
};

export function SegmentedToggle({
  value,
  onValueChange,
  leftLabel,
  rightLabel,
  leftSubLabel,
  rightSubLabel,
  highlightedValue,
  className,
}: Props) {
  const isLeftSelected = value === 'left';
  const isRightSelected = value === 'right';
  const isHighlightedSelected = value === highlightedValue;

  return (
    <div className={cn('relative grid grid-cols-2 rounded-xl bg-muted p-1', className)}>
      {value && (
        <div
          className={cn(
            'absolute top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-lg shadow-sm transition-all duration-300 ease-out',
            isLeftSelected ? 'left-1' : 'left-[calc(50%+2px)]',
            isHighlightedSelected
              ? 'border border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950'
              : 'bg-background',
          )}
        />
      )}

      <button
        type="button"
        onClick={() => onValueChange('left')}
        className={cn(
          'relative z-10 flex flex-col items-center justify-center gap-0.5 rounded-lg px-4 py-2 font-semibold transition-colors',
          isLeftSelected
            ? highlightedValue === 'left'
              ? 'text-green-700 dark:text-green-400'
              : 'text-foreground'
            : 'text-muted-foreground',
        )}
      >
        <span>{leftLabel}</span>
        {leftSubLabel}
      </button>

      <button
        type="button"
        onClick={() => onValueChange('right')}
        className={cn(
          'relative z-10 flex flex-col items-center justify-center gap-0.5 rounded-lg px-4 py-2 font-semibold transition-colors',
          isRightSelected
            ? highlightedValue === 'right'
              ? 'text-green-700 dark:text-green-400'
              : 'text-foreground'
            : 'text-muted-foreground',
        )}
      >
        <span>{rightLabel}</span>
        {rightSubLabel}
      </button>
    </div>
  );
}

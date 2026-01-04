import { cn } from '@utils/shadcn';

type Props = {
  certified?: boolean;
};

export const CertifiedBadge = ({ certified = true }: Props) => {
  return (
    <span className="relative flex size-1.5">
      <span
        className={cn(
          'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
          certified ? 'bg-emerald-600 dark:bg-emerald-200' : 'bg-red-500 dark:bg-red-100',
        )}
      ></span>
      <span
        className={cn(
          'relative inline-flex size-1.5 rounded-full',
          certified ? 'bg-emerald-800 dark:bg-emerald-400' : 'bg-red-800 dark:bg-red-400',
        )}
      ></span>
    </span>
  );
};

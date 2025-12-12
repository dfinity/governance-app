import { cn } from '@utils/shadcn';

type Props = {
  certified?: boolean;
};

export const CertifiedBadge = ({ certified = true }: Props) => {
  return (
    <span className="relative flex size-2">
      <span
        className={cn(
          'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
          certified ? 'bg-green-400' : 'bg-red-400',
        )}
      ></span>
      <span
        className={cn(
          'relative inline-flex size-2 rounded-full',
          certified ? 'bg-green-600' : 'bg-red-600',
        )}
      ></span>
    </span>
  );
};

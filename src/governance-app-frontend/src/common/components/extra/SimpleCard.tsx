import { cx } from '@untitledui/utils/cx';

type Props = {
  children: React.ReactNode;
  className?: string;
};

export const SimpleCard = ({ children, className }: Props) => {
  return (
    <div
      className={cx(
        'flex h-full flex-col justify-between rounded-lg bg-primary p-4 shadow-xs ring-1 ring-secondary ring-inset focus-visible:outline-2 focus-visible:outline-offset-2',
        className,
      )}
    >
      {children}
    </div>
  );
};

import type { ComponentType, ReactNode } from 'react';

import { Button } from '@components/button';
import { cn } from '@utils/shadcn';

type Icon = ComponentType<{ className?: string }>;

type Props = {
  icon: Icon;
  title: ReactNode;
  description: ReactNode;
  ctaLabel: ReactNode;
  ctaIcon?: Icon;
  onCtaClick: () => void;
  ctaTestId?: string;
  helper?: ReactNode;
  className?: string;
};

export const EmptyActionState = ({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaIcon: CtaIcon,
  onCtaClick,
  ctaTestId,
  helper,
  className,
}: Props) => (
  <div
    className={cn('mt-20 flex w-full flex-col items-center justify-center text-center', className)}
  >
    <div className="flex size-[5.5rem] items-center justify-center rounded-full border-2 border-secondary/90 bg-secondary/30">
      <Icon className="size-10 text-muted-foreground" />
    </div>
    <div className="mt-6 flex w-full max-w-sm flex-col items-center gap-3">
      <h3 className="flex min-h-9 w-full items-center justify-center text-3xl leading-9 font-normal">
        {title}
      </h3>
      <p className="text-base text-muted-foreground">{description}</p>
    </div>
    <Button
      data-testid={ctaTestId}
      className="mt-6 w-full sm:w-auto"
      onClick={onCtaClick}
      size="xl"
    >
      {CtaIcon && <CtaIcon />}
      {ctaLabel}
    </Button>
    {helper && <p className="mt-4 max-w-md text-sm text-muted-foreground">{helper}</p>}
  </div>
);

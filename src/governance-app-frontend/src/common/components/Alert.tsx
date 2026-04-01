import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@common/utils/shadcn';

const alertVariants = cva(
  'relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        destructive:
          'text-destructive bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90',
        success:
          'border-green-200 bg-green-50 text-green-800 [&>svg]:text-green-600 *:data-[slot=alert-description]:text-green-700 dark:bg-green-800/20 dark:border-green-900/50 dark:text-green-200 dark:[&>svg]:text-green-400 dark:*:data-[slot=alert-description]:text-green-300',
        warning:
          'bg-amber-50 border-amber-200 text-amber-800 *:data-[slot=alert-description]:text-amber-700 dark:bg-amber-900/20 dark:border-amber-900/50 dark:text-amber-200 dark:*:data-[slot=alert-description]:text-amber-300 [&>svg]:text-current',
        danger:
          'border-red-200 bg-red-50 text-red-800 *:data-[slot=alert-description]:text-red-700 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-200 dark:*:data-[slot=alert-description]:text-red-300 [&>svg]:text-current',
        info: 'border-blue-200 bg-blue-50 text-blue-800 [&>svg]:text-blue-600 *:data-[slot=alert-description]:text-blue-700 dark:bg-blue-800/20 dark:border-blue-900/50 dark:text-blue-200 dark:[&>svg]:text-blue-400 dark:*:data-[slot=alert-description]:text-blue-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-title"
      className={cn('col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight', className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        'col-start-2 grid justify-items-start gap-1 text-sm text-muted-foreground [&_p]:leading-relaxed',
        className,
      )}
      {...props}
    />
  );
}

export { Alert, AlertDescription, AlertTitle };

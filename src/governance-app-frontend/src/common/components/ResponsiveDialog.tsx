import * as React from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@components/Dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@components/Drawer';
import { useMediaQuery } from '@hooks/useMediaQuery';
import { cn } from '@utils/shadcn';

type Props = React.ComponentProps<typeof Dialog> & {
  dismissible?: boolean;
};

export function ResponsiveDialog({ children, dismissible = true, ...props }: Props) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return <Dialog {...props}>{children}</Dialog>;
  }

  return (
    <Drawer dismissible={dismissible} {...props}>
      {children}
    </Drawer>
  );
}

export function ResponsiveDialogTrigger({
  className,
  ...props
}: React.ComponentProps<typeof DialogTrigger>) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return <DialogTrigger className={className} {...props} />;
  }

  return <DrawerTrigger className={className} {...props} />;
}

export function ResponsiveDialogContent({
  className,
  children,
  showCloseButton,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <DialogContent className={className} showCloseButton={showCloseButton} {...props}>
        {children}
      </DialogContent>
    );
  }

  return (
    <DrawerContent
      className={cn(className, 'max-h-[calc(90vh-env(safe-area-inset-top))] overflow-y-hidden')}
      {...props}
    >
      <div className="mx-auto flex min-h-0 w-full flex-1 flex-col overflow-y-auto overscroll-y-contain">
        {children}
      </div>
    </DrawerContent>
  );
}

export function ResponsiveDialogHeader({
  className,
  ...props
}: React.ComponentProps<typeof DialogHeader>) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return <DialogHeader className={className} {...props} />;
  }

  return <DrawerHeader className={cn('text-left', className)} {...props} />;
}

export function ResponsiveDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return <DialogTitle className={className} {...props} />;
  }

  return <DrawerTitle className={className} {...props} />;
}

export function ResponsiveDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return <DialogDescription className={className} {...props} />;
  }

  return <DrawerDescription className={className} {...props} />;
}

export function ResponsiveDialogFooter({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogHeader>) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <div className={className} {...props}>
        {children}
      </div>
    );
  }

  return <DrawerFooter className="pt-2">{children}</DrawerFooter>;
}

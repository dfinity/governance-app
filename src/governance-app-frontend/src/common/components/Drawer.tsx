import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';

import { cn } from '@utils/shadcn';

let documentScrollLocks = 0;
let restoreDocumentScroll: (() => void) | undefined;

/**
 * Freezes the document at its scroll position while a drawer is open. On mobile the document
 * scrolls, and vaul does not start a drag while the document is scrolled.
 */
const lockDocumentScroll = () => {
  documentScrollLocks += 1;
  if (documentScrollLocks === 1 && window.scrollY > 0) {
    const { scrollY } = window;
    const { pathname } = window.location;
    const { style } = document.body;
    // `important` beats the `position: relative !important` of the Radix scroll lock.
    style.setProperty('position', 'fixed', 'important');
    Object.assign(style, { top: `${-scrollY}px`, left: '0px', right: '0px' });
    restoreDocumentScroll = () => {
      style.removeProperty('position');
      Object.assign(style, { top: '', left: '', right: '' });
      // The drawer can close because the page changed. The new page keeps its own position.
      if (window.location.pathname === pathname) {
        window.scrollTo({ top: scrollY, behavior: 'instant' });
      }
    };
  }

  return () => {
    documentScrollLocks -= 1;
    if (documentScrollLocks === 0) {
      restoreDocumentScroll?.();
      restoreDocumentScroll = undefined;
    }
  };
};

const DocumentScrollLock = () => {
  React.useLayoutEffect(lockDocumentScroll, []);
  return null;
};

function Drawer({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  // `DocumentScrollLock` replaces the body styles of vaul, which only apply in Safari.
  return <DrawerPrimitive.Root data-slot="drawer" noBodyStyles {...props} />;
}

function DrawerTrigger({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 standalone:bottom-[calc(100dvh-100vh)]',
        className,
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      {...props}
    />
  );
}

function DrawerContent({
  className,
  children,
  onClick,
  style,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content
        aria-describedby={undefined}
        data-slot="drawer-content"
        className={cn(
          'group/drawer-content fixed z-50 flex h-auto flex-col bg-background',
          'data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-16 data-[vaul-drawer-direction=top]:max-h-[90vh] data-[vaul-drawer-direction=top]:rounded-b-lg data-[vaul-drawer-direction=top]:border-b',
          'data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-16 data-[vaul-drawer-direction=bottom]:max-h-[calc(90vh-env(safe-area-inset-top))] data-[vaul-drawer-direction=bottom]:rounded-t-lg data-[vaul-drawer-direction=bottom]:border-t data-[vaul-drawer-direction=bottom]:pb-[env(safe-area-inset-bottom)] standalone:data-[vaul-drawer-direction=bottom]:bottom-[calc(100dvh-100vh)]',
          'data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=right]:sm:max-w-sm',
          'data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=left]:sm:max-w-sm',
          // Custom styles
          'px-4',
          'after:h-0!',
          className,
        )}
        // Override vaul's `touch-action: none` CSS rule (from style.css) which
        // prevents ALL native touch scrolling inside the drawer. Inline styles
        // beat external CSS specificity, restoring vertical panning for inner
        // scroll containers while vaul's pointer-event drag still works for
        // non-scrollable areas (handle, non-overflowing content).
        style={{ ...style, touchAction: 'pan-y' }}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(e);
        }}
        {...props}
      >
        <DocumentScrollLock />
        <div className="mx-auto mt-4 hidden h-2 w-[100px] shrink-0 rounded-full bg-muted group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        'flex flex-col gap-0.5 p-4 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center md:gap-1.5 md:text-left',
        className,
      )}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn('mt-auto flex flex-col gap-2 p-4', className)}
      {...props}
    />
  );
}

function DrawerTitle({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn('font-serif text-2xl leading-tight font-normal text-foreground', className)}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
};

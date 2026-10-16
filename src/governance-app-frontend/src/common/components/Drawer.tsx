import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';

import { cn } from '@utils/shadcn';

// vaul lifts a bottom drawer by `innerHeight - visualViewport.height` when the
// visual viewport resizes. On iOS the window scrolls to the focused field just
// after that resize, so the offset is too large: the drawer and the field go off
// the top of the screen. On iOS the drawer follows the visual viewport instead.
// iPadOS reports a Mac user agent, so touch support identifies it.
const isIos =
  typeof navigator !== 'undefined' &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1));

// The resize and the scroll that follows it come up to tens of milliseconds
// apart. A read after the last of them gets the final position.
const VIEWPORT_SETTLE_MS = 100;

type VisibleArea = {
  height: number;
  // Space between the bottom of the layout viewport and the bottom of the
  // visible area, which the keyboard covers.
  keyboardInset: number;
};

const getIosViewport = () => (isIos ? (window.visualViewport ?? null) : null);

const readVisibleArea = (viewport: VisualViewport): VisibleArea => ({
  height: Math.round(viewport.height),
  keyboardInset: Math.max(
    0,
    Math.round(document.documentElement.clientHeight - viewport.offsetTop - viewport.height),
  ),
});

const useVisibleArea = (): VisibleArea | null => {
  // A drawer can open while the keyboard is already open, so the first render
  // reads the viewport.
  const [area, setArea] = React.useState<VisibleArea | null>(() => {
    const viewport = getIosViewport();
    return viewport ? readVisibleArea(viewport) : null;
  });

  React.useEffect(() => {
    const viewport = getIosViewport();
    if (!viewport) return;

    let shown = readVisibleArea(viewport);
    const show = (next: VisibleArea) => {
      if (next.height === shown.height && next.keyboardInset === shown.keyboardInset) return;
      shown = next;
      setArea(next);
    };

    let timer: ReturnType<typeof setTimeout> | undefined;
    const onChange = () => {
      clearTimeout(timer);
      const next = readVisibleArea(viewport);
      // A drawer that only moves down or gets taller cannot go off the screen,
      // so it follows the keyboard close at once.
      if (next.keyboardInset <= shown.keyboardInset && next.height >= shown.height) {
        show(next);
      } else {
        timer = setTimeout(() => show(readVisibleArea(viewport)), VIEWPORT_SETTLE_MS);
      }
    };

    viewport.addEventListener('resize', onChange);
    viewport.addEventListener('scroll', onChange);
    return () => {
      clearTimeout(timer);
      viewport.removeEventListener('resize', onChange);
      viewport.removeEventListener('scroll', onChange);
    };
  }, []);

  return area;
};

function Drawer({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root data-slot="drawer" repositionInputs={!isIos} {...props} />;
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
        'fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
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
  // A bottom drawer ends at the top of the keyboard. The visible height limits
  // the drawer, so its content scrolls instead of going under the status bar.
  const visibleArea = useVisibleArea();

  // iOS does not scroll the content of a fixed drawer to the focused field, so
  // the field scrolls into the visible part when the keyboard opens.
  React.useEffect(() => {
    if (visibleArea === null) return;
    const field = document.activeElement;
    if (field instanceof HTMLElement && field.closest('[data-slot="drawer-content"]')) {
      field.scrollIntoView({ block: 'nearest' });
    }
  }, [visibleArea]);

  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content
        aria-describedby={undefined}
        data-slot="drawer-content"
        className={cn(
          'group/drawer-content fixed z-50 flex h-auto flex-col bg-background',
          'data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-16 data-[vaul-drawer-direction=top]:max-h-[90vh] data-[vaul-drawer-direction=top]:rounded-b-lg data-[vaul-drawer-direction=top]:border-b',
          'data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-[var(--drawer-keyboard-inset,0px)] data-[vaul-drawer-direction=bottom]:mt-16 data-[vaul-drawer-direction=bottom]:max-h-[calc(min(90vh,var(--drawer-visible-height,100vh))-env(safe-area-inset-top))] data-[vaul-drawer-direction=bottom]:rounded-t-lg data-[vaul-drawer-direction=bottom]:border-t data-[vaul-drawer-direction=bottom]:pb-[env(safe-area-inset-bottom)]',
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
        style={
          {
            ...style,
            touchAction: 'pan-y',
            ...(visibleArea !== null && {
              '--drawer-visible-height': `${visibleArea.height}px`,
              '--drawer-keyboard-inset': `${visibleArea.keyboardInset}px`,
            }),
          } as React.CSSProperties
        }
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(e);
        }}
        {...props}
      >
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

import { cn } from '@/lib/utils';
import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useState,
  type ReactNode,
} from 'react';

import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  Dialog as ShadcnDialog,
  DialogTrigger as ShadcnDialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerTrigger as ShadcnDrawerTrigger,
} from '@/components/ui/drawer';

import { useMediaQuery } from '../hooks/useMediaQuery';

// Context to provide 'close' function and screen state
const ModalContext = createContext<{ close: () => void; isDesktop: boolean }>({
  close: () => {},
  isDesktop: true,
});

export const DialogTrigger = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const close = () => setOpen(false);

  let trigger: ReactNode = null;
  let content: ReactNode = null;

  Children.map(children, (child) => {
    if (!isValidElement(child)) return;
    // Check for slot="trigger"
    const element = child as any;
    if (element.props?.slot === 'trigger') {
      trigger = child;
    } else {
      content = child;
    }
  });

  if (isDesktop) {
    return (
      <ModalContext.Provider value={{ close, isDesktop: true }}>
        <ShadcnDialog open={open} onOpenChange={setOpen}>
          <ShadcnDialogTrigger asChild>{trigger || <button>Open</button>}</ShadcnDialogTrigger>
          {content}
        </ShadcnDialog>
      </ModalContext.Provider>
    );
  }

  return (
    <ModalContext.Provider value={{ close, isDesktop: false }}>
      <Drawer open={open} onOpenChange={setOpen}>
        <ShadcnDrawerTrigger asChild>{trigger || <button>Open</button>}</ShadcnDrawerTrigger>
        {content}
      </Drawer>
    </ModalContext.Provider>
  );
};

export const ModalOverlay = ({ children, isKeyboardDismissDisabled }: any) => {
  // Shadcn handles overlay internally in Content components.
  return <>{children}</>;
};

export interface ModalProps {
  children: ReactNode;
  className?: string; // This usually comes with bg-primary/p-6 from the old code, which we removed or kept as p-6
}

export const Modal = ({ children, className }: ModalProps) => {
  const { isDesktop } = useContext(ModalContext);

  if (isDesktop) {
    return (
      <DialogContent className={cn('sm:max-w-lg', className, 'max-h-[85vh] overflow-y-auto')}>
        {children}
        <div className="sr-only">
          <DialogTitle>Dialog</DialogTitle>
        </div>
      </DialogContent>
    );
  }

  return (
    <DrawerContent>
      {/* Drawer content usually needs some padding and handling of the 'handle' */}
      <div className={cn('mx-auto w-full max-w-md px-4 pt-4 pb-8', className)}>
        {children}
        <div className="sr-only">
          <DialogTitle>Drawer</DialogTitle>
        </div>
      </div>
    </DrawerContent>
  );
};

// Inner Dialog component which provides the 'close' render prop
export const Dialog = ({ children }: { children: (props: { close: () => void }) => ReactNode }) => {
  const { close } = useContext(ModalContext);

  // Check if children is function
  if (typeof children === 'function') {
    return <>{children({ close })}</>;
  }
  return <>{children}</>;
};

export const ModalHeader = DialogHeader;
export const ModalTitle = DialogTitle;

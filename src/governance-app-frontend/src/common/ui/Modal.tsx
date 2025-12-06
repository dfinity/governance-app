import {
    Dialog as ShadcnDialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger as ShadcnDialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { createContext, useContext, useState, Children, isValidElement, type ReactNode } from "react";

// Context to provide 'close' function
const ModalContext = createContext<{ close: () => void }>({ close: () => { } });

export const DialogTrigger = ({ children }: { children: ReactNode }) => {
    const [open, setOpen] = useState(false);
    const close = () => setOpen(false);

    let trigger: ReactNode = null;
    let content: ReactNode = null;

    Children.map(children, (child) => {
        if (!isValidElement(child)) return;
        // Check for slot="trigger"
        // Need to cast to any or ReactElement with props
        const element = child as any;
        if (element.props?.slot === "trigger") {
            trigger = child;
        } else {
            content = child;
        }
    });

    // If no explicit trigger slot found, try first element? 
    // UntitledUi usage seems consistent with slot="trigger".

    return (
        <ModalContext.Provider value={{ close }}>
            <ShadcnDialog open={open} onOpenChange={setOpen}>
                <ShadcnDialogTrigger asChild>
                    {trigger || <button>Open</button>}
                </ShadcnDialogTrigger>
                {content}
            </ShadcnDialog>
        </ModalContext.Provider>
    );
};

export const ModalOverlay = ({ children, isKeyboardDismissDisabled }: any) => {
    // Shadcn Dialog handles overlay. 
    // We just render children (which is Modal).
    return <>{children}</>;
};

export interface ModalProps {
    children: ReactNode;
    className?: string;
}

export const Modal = ({ children, className }: ModalProps) => {
    return (
        <DialogContent className={cn("sm:max-w-lg", className, "max-h-[85vh] overflow-y-auto")}>
            {/* Render children. Often contains Dialog (Inner) or direct content */}
            {children}
            {/* Accessibility title fallback if needed */}
            <div className="sr-only">
                <DialogTitle>Dialog</DialogTitle>
            </div>
        </DialogContent>
    );
};

// Inner Dialog component which provides the 'close' render prop
export const Dialog = ({ children }: { children: (props: { close: () => void }) => ReactNode }) => {
    const { close } = useContext(ModalContext);

    // Check if children is function
    if (typeof children === "function") {
        return <>{children({ close })}</>;
    }
    return <>{children}</>;
};

export const ModalHeader = DialogHeader;
export const ModalTitle = DialogTitle;

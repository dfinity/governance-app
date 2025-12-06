import { createLink, Link as RouterLink } from '@tanstack/react-router';
import * as React from 'react';
import { cn } from "@/lib/utils";

// Basic Link component extending standard anchor
// Integrating with TanStack Router
const BasicLink = React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement>>(
    ({ className, ...props }, ref) => {
        return (
            <a
                ref={ref}
                className={cn("font-medium text-primary underline-offset-4 hover:underline", className)}
                {...props}
            />
        )
    }
)
BasicLink.displayName = 'BasicLink'

export const Link = createLink(BasicLink);

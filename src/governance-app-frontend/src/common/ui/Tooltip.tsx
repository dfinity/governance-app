import {
  Tooltip as ShadcnTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger as ShadcnTooltipTrigger,
} from '@/components/ui/tooltip';
import type { ReactNode } from 'react';

export interface TooltipProps {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  arrow?: boolean; // Shadcn doesn't natively support arrow toggle quickly without class overrides, but typically it has a small arrow.
  placement?: 'top' | 'bottom' | 'left' | 'right'; // Shadcn (radix) supports 'side'
}

export const TooltipTrigger = ShadcnTooltipTrigger;

export const Tooltip = ({ title, description, children, placement = 'top' }: TooltipProps) => {
  // Map 'placement' to 'side'
  // Radix uses 'top', 'bottom', 'left', 'right'. Matches.

  return (
    <TooltipProvider>
      <ShadcnTooltip>
        {/* Children usually contains the trigger. 
                    If children is just a node, we might need to wrap in TooltipTrigger if not already. 
                    UntitledUi usage: <Tooltip><TooltipTrigger>...</TooltipTrigger></Tooltip>
                    So children is TooltipTrigger.
                */}
        {children}
        <TooltipContent side={placement}>
          <div className="text-xs font-semibold">{title}</div>
          {description && <div className="text-xs text-muted-foreground">{description}</div>}
        </TooltipContent>
      </ShadcnTooltip>
    </TooltipProvider>
  );
};

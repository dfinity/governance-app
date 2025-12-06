import { Input as ShadcnInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { HelpCircle, AlertCircle } from 'lucide-react';
import type { ComponentType, HTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';

// Types matching UntitledUi
type BaseInputAttributes = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'onChange'>;

export interface InputProps extends BaseInputAttributes {
  label?: string;
  hint?: ReactNode;
  tooltip?: string;
  size?: 'sm' | 'md';

  icon?: ComponentType<HTMLAttributes<HTMLOrSVGElement>>;
  iconClassName?: string;
  inputClassName?: string;
  wrapperClassName?: string;
  tooltipClassName?: string;
  shortcut?: string | boolean;
  isInvalid?: boolean;
  hideRequiredIndicator?: boolean;

  // Support function that takes string value
  onChange?: (value: any) => void;
  // Backward compatibility
  isDisabled?: boolean;
  isRequired?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      size = 'sm',
      label,
      hint,
      tooltip,
      icon: Icon,
      iconClassName,
      inputClassName,
      wrapperClassName,
      tooltipClassName,
      shortcut,
      isInvalid,
      hideRequiredIndicator,
      disabled,
      isDisabled,
      required,
      isRequired,
      id,
      onChange,
      ...props
    },
    ref,
  ) => {
    const generatedId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    const hasLeadingIcon = !!Icon;
    const hasTrailingIcon = !!tooltip || !!isInvalid;

    // Prioritize disabled, then isDisabled
    const effectiveDisabled = disabled || isDisabled;
    const effectiveRequired = required || isRequired;

    const heightClass = size === 'sm' ? 'h-9 text-sm' : 'h-11 text-base';
    const paddingLeftClass = hasLeadingIcon ? 'pl-9' : 'pl-3';
    const paddingRightClass = hasTrailingIcon || shortcut ? 'pr-9' : 'pr-3';

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        // Pass value string as expected by call sites
        // Try to pass string.
        onChange(e.target.value);
      }
    };

    return (
      <div className={cn('grid w-full gap-1.5', className)}>
        {label && (
          <Label
            htmlFor={generatedId}
            className={cn(
              isInvalid && 'text-destructive',
              effectiveDisabled && 'cursor-not-allowed opacity-70',
            )}
          >
            {label}
            {!hideRequiredIndicator && effectiveRequired && (
              <span className="ml-1 text-destructive">*</span>
            )}
          </Label>
        )}

        <div className={cn('relative', wrapperClassName)}>
          {Icon && (
            <div
              className={cn(
                'pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground',
                iconClassName,
              )}
            >
              <Icon className="size-4" />
            </div>
          )}

          <ShadcnInput
            id={generatedId}
            className={cn(
              heightClass,
              paddingLeftClass,
              paddingRightClass,
              isInvalid && 'border-destructive focus-visible:ring-destructive/20',
              inputClassName,
            )}
            disabled={effectiveDisabled}
            required={effectiveRequired}
            ref={ref}
            onChange={handleChange}
            {...props}
          />

          <div className="absolute top-1/2 right-2.5 flex -translate-y-1/2 items-center gap-2">
            {shortcut && !isInvalid && !tooltip && (
              <div className="pointer-events-none flex items-center">
                <span className="rounded border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                  {typeof shortcut === 'string' ? shortcut : '⌘K'}
                </span>
              </div>
            )}

            {isInvalid && <AlertCircle className="size-4 text-destructive" />}

            {tooltip && !isInvalid && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle
                      className={cn(
                        'size-4 cursor-pointer text-muted-foreground hover:text-foreground',
                        tooltipClassName,
                      )}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {hint && (
          <p className={cn('text-sm text-muted-foreground', isInvalid && 'text-destructive')}>
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

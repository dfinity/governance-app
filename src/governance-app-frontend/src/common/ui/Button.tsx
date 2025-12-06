import { Button as ShadcnButton } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link, type LinkProps as RouterLinkProps } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, DetailedHTMLProps, FC, ReactNode, ComponentProps } from 'react';
import { isValidElement } from 'react';

type ShadcnButtonProps = ComponentProps<typeof ShadcnButton>;

// Types adapted from UntitledUi to ensure compatibility
export interface CommonProps {
  isDisabled?: boolean;
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?:
    | 'primary'
    | 'secondary'
    | 'tertiary'
    | 'link-gray'
    | 'link-color'
    | 'primary-destructive'
    | 'secondary-destructive'
    | 'tertiary-destructive'
    | 'link-destructive';
  iconLeading?: FC<{ className?: string }> | ReactNode;
  iconTrailing?: FC<{ className?: string }> | ReactNode;
  noTextPadding?: boolean;
  showTextWhileLoading?: boolean;
  children?: ReactNode;
  className?: string; // Add className explicitly
}

export interface ButtonProps
  extends CommonProps,
    Omit<
      DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>,
      'color' | 'ref'
    > {
  to?: never;
}

// Loosen Router Link props to avoid strict type mismatch with 'to' union string
interface LinkButtonProps
  extends CommonProps,
    Omit<RouterLinkProps, 'children' | 'color' | 'size' | 'style' | 'to'> {
  to: string | any;
}

export type Props = ButtonProps | LinkButtonProps;

export const Button = ({
  size = 'sm',
  color = 'primary',
  children,
  className,
  noTextPadding,
  iconLeading: IconLeading,
  iconTrailing: IconTrailing,
  isDisabled,
  isLoading,
  showTextWhileLoading,
  ...props
}: Props) => {
  // Map sizes
  const shadcnSizeMap: Record<string, ShadcnButtonProps['size']> = {
    sm: 'sm',
    md: 'default',
    lg: 'lg',
    xl: 'lg', // Map xl to lg
  };

  // Map colors to variants
  // Using string because we might need custom classes
  const getVariantAndClasses = (): {
    variant: ShadcnButtonProps['variant'];
    className?: string;
  } => {
    switch (color) {
      case 'primary':
        return { variant: 'default' };
      case 'secondary':
        // Use semantic secondary colors
        return {
          variant: 'outline',
          className:
            'bg-background text-foreground hover:bg-accent hover:text-accent-foreground border-input',
        };
      case 'tertiary':
        // Use semantic ghost colors
        return {
          variant: 'ghost',
          className: 'text-muted-foreground hover:text-foreground hover:bg-accent',
        };
      case 'link-gray':
        return {
          variant: 'link',
          className: 'text-muted-foreground hover:text-foreground p-0 h-auto',
        };
      case 'link-color':
        return { variant: 'link', className: 'text-primary hover:text-primary/80 p-0 h-auto' };
      case 'primary-destructive':
        return { variant: 'destructive' };
      case 'secondary-destructive':
        return {
          variant: 'outline',
          className:
            'border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive',
        };
      case 'tertiary-destructive':
        return {
          variant: 'ghost',
          className: 'text-destructive hover:bg-destructive/10 hover:text-destructive',
        };
      case 'link-destructive':
        return {
          variant: 'link',
          className: 'text-destructive hover:text-destructive/80 p-0 h-auto',
        };
      default:
        return { variant: 'default' };
    }
  };

  const { variant, className: variantClassName } = getVariantAndClasses();
  const shadcnSize = shadcnSizeMap[size] || 'default';

  const content = (
    <>
      {isLoading && (
        <Loader2
          className={cn('mr-2 size-4 animate-spin', showTextWhileLoading ? '' : 'absolute')}
        />
      )}

      {/* Leading Icon */}
      {!isLoading && isValidElement(IconLeading) && IconLeading}
      {!isLoading && typeof IconLeading === 'function' && <IconLeading className="mr-2 size-4" />}

      <span className={isLoading && !showTextWhileLoading ? 'invisible' : ''}>{children}</span>

      {/* Trailing Icon */}
      {!isLoading && isValidElement(IconTrailing) && IconTrailing}
      {!isLoading && typeof IconTrailing === 'function' && <IconTrailing className="ml-2 size-4" />}
    </>
  );

  const commonClasses = cn(variantClassName, className);

  if ('to' in props && props.to) {
    const { to, ...linkProps } = props as LinkButtonProps;
    return (
      <ShadcnButton
        variant={variant}
        size={shadcnSize as any}
        className={commonClasses}
        disabled={isDisabled || isLoading}
        asChild
      >
        <Link to={to} {...linkProps} disabled={isDisabled}>
          {content}
        </Link>
      </ShadcnButton>
    );
  }

  return (
    <ShadcnButton
      variant={variant}
      size={shadcnSize as any}
      className={commonClasses}
      disabled={isDisabled || isLoading}
      {...props}
    >
      {content}
    </ShadcnButton>
  );
};

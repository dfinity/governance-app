import type { FC, MouseEventHandler, ReactNode } from 'react';

import { Badge as ShadcnBadge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Types matching UntitledUi
export type BadgeTypes = 'pill-color' | 'badge-color' | 'badge-modern' | 'color';
export type Sizes = 'sm' | 'md' | 'lg';
export type BadgeColors =
  | 'gray'
  | 'brand'
  | 'error'
  | 'warning'
  | 'success'
  | 'gray-blue'
  | 'blue-light'
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'pink'
  | 'orange';

export interface BadgeProperties {
  children?: ReactNode;
  type?: BadgeTypes;
  size?: Sizes;
  color?: BadgeColors;
  icon?: FC<{ className?: string }>;
  iconLeading?: FC<{ className?: string }>;
  iconTrailing?: FC<{ className?: string }>;
  className?: string; // Add className
  onClick?: MouseEventHandler;
}

// Map UntitledUi colors to Tailwind classes
// Assuming standard Tailwind palette or Shadcn theme variables.
// Previous UntitledUi likely used specific utility classes (e.g. bg-utility-gray-50).
// We map to closest standard tailwind/shadcn colors.

const getBadgeClasses = (color: BadgeColors = 'gray', type: BadgeTypes = 'badge-color'): string => {
  // Basic mapping logic
  // We can refine this based on the visual design requirement.
  // Shadcn Badge 'default' is primary/primary-foreground (black/white).
  // 'secondary' is secondary/secondary-foreground (grayish).
  // 'destructive' is red.
  // 'outline' is border.

  const colorMap: Record<BadgeColors, string> = {
    gray: 'bg-gray-100 text-gray-700 hover:bg-gray-100/80 border-gray-200',
    brand: 'bg-blue-100 text-blue-700 hover:bg-blue-100/80 border-blue-200',
    error: 'bg-red-100 text-red-700 hover:bg-red-100/80 border-red-200',
    warning: 'bg-orange-100 text-orange-700 hover:bg-orange-100/80 border-orange-200',
    success: 'bg-green-100 text-green-700 hover:bg-green-100/80 border-green-200',
    'gray-blue': 'bg-slate-100 text-slate-700 hover:bg-slate-100/80 border-slate-200',
    'blue-light': 'bg-sky-100 text-sky-700 hover:bg-sky-100/80 border-sky-200',
    blue: 'bg-blue-100 text-blue-700 hover:bg-blue-100/80 border-blue-200',
    indigo: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100/80 border-indigo-200',
    purple: 'bg-purple-100 text-purple-700 hover:bg-purple-100/80 border-purple-200',
    pink: 'bg-pink-100 text-pink-700 hover:bg-pink-100/80 border-pink-200',
    orange: 'bg-orange-100 text-orange-700 hover:bg-orange-100/80 border-orange-200',
  };

  return colorMap[color] || colorMap.gray;
};

export const Badge = ({
  children,
  size = 'md',
  type = 'badge-color',
  color = 'gray',
  icon,
  iconLeading,
  iconTrailing: IconTrailing,
  className,
  onClick,
}: BadgeProperties) => {
  // Support both icon and iconLeading
  const Icon = icon || iconLeading;

  let sizeClasses = '';
  if (type === 'pill-color') {
    if (size === 'sm') sizeClasses = 'px-2 py-0.5 text-xs';
    else if (size === 'md') sizeClasses = 'px-2.5 py-0.5 text-sm';
    else sizeClasses = 'px-3 py-1 text-sm';
  } else {
    // badge-color / badge-modern / color
    if (size === 'sm') sizeClasses = 'px-1.5 py-0.5 text-xs';
    else if (size === 'md') sizeClasses = 'px-2 py-0.5 text-sm';
    else sizeClasses = 'px-2.5 py-1 text-sm rounded-lg';
  }

  // Type classes (rounding)
  let typeClasses = '';
  if (type === 'pill-color') typeClasses = 'rounded-full';
  else if (type === 'badge-modern') typeClasses = 'rounded-md shadow-xs';
  else typeClasses = 'rounded-md'; // badge-color / color

  // Color classes
  // Mapping to standard colors for now.
  const colorClasses = getBadgeClasses(color, type);

  const combinedClassName = cn(
    'font-medium border inline-flex items-center gap-1.5',
    sizeClasses,
    typeClasses,
    colorClasses,
    onClick && 'cursor-pointer hover:opacity-80',
    className,
  );

  return (
    <ShadcnBadge variant="secondary" className={combinedClassName} onClick={onClick}>
      {Icon && <Icon className="size-3" />}
      {children}
      {IconTrailing && <IconTrailing className="size-3" />}
    </ShadcnBadge>
  );
};

// Adapters for specific Badge variations if needed
export const BadgeWithDot = ({ dot, ...props }: any) => {
  // Dot implementation: simplified as a leading dot character or small div
  return (
    <Badge {...props}>
      <span className="mr-1.5 flex h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {props.children}
    </Badge>
  );
};

export const BadgeWithIcon = Badge;

export const BadgeWithFlag = Badge;

export const BadgeWithImage = ({ imgSrc, ...props }: any) => (
  <Badge {...props}>
    <img src={imgSrc} alt="" className="mr-1.5 size-4 rounded-full" />
    {props.children}
  </Badge>
);

export const BadgeWithButton = ({ onButtonClick, ...props }: any) => (
  <Badge {...props}>
    {props.children}
    <button
      onClick={(e) => {
        e.stopPropagation();
        onButtonClick();
      }}
      className="ml-1 rounded-full p-0.5 hover:bg-black/10"
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M7.5 2.5L2.5 7.5M2.5 2.5L7.5 7.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  </Badge>
);

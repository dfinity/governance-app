import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';
import type React from 'react'; // Added this import for React.ElementType

interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

export const Heading = ({ level = 1, className, children, ...props }: HeadingProps) => {
  // Construct tag name dynamically
  const TagString = `h${level}` as const;
  // Cast to any valid element type for React
  const Component = TagString as React.ElementType;

  // Default Shadcn typography classes
  const sizeClasses = {
    1: 'scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl',
    2: 'scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0',
    3: 'scroll-m-20 text-2xl font-semibold tracking-tight',
    4: 'scroll-m-20 text-xl font-semibold tracking-tight',
    5: 'scroll-m-20 text-lg font-semibold tracking-tight',
    6: 'scroll-m-20 text-base font-semibold tracking-tight',
  };

  return (
    <Component className={cn(sizeClasses[level], className)} {...props}>
      {children}
    </Component>
  );
};

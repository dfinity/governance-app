import type { FC, ReactNode } from 'react';

import { Avatar as ShadcnAvatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'xxs' | 'xxl' | '3xl' | '4xl';

export interface AvatarProps {
  src?: string;
  alt?: string;
  initials?: string;
  size?: AvatarSize;
  placeholder?: boolean;
  placeholderIcon?: FC<{ className?: string }>;
  badge?: ReactNode; // Status badge essentially
  className?: string; // Add className explicitly
  status?: 'online' | 'offline' | 'busy' | 'away'; // Simplified status mapping
  verified?: boolean;
  focusable?: boolean;
  contrastBorder?: boolean;
}

export const Avatar = ({
  src,
  alt,
  initials,
  size = 'md',
  placeholderIcon: PlaceholderIcon,
  badge,
  className,
  status,
  verified,
  focusable,
  contrastBorder,
}: AvatarProps) => {
  // Map sizes
  const sizeMap: Record<AvatarSize, string> = {
    xxs: 'size-4 text-[8px]',
    xs: 'size-6 text-[10px]',
    sm: 'size-8 text-xs',
    md: 'size-10 text-sm',
    lg: 'size-12 text-base',
    xl: 'size-14 text-lg',
    '2xl': 'size-16 text-xl',
    xxl: 'size-20 text-2xl', // Assuming equivalent
    '3xl': 'size-24 text-3xl',
    '4xl': 'size-32 text-4xl',
  };

  const containerSizeClass = sizeMap[size] || sizeMap.md;

  return (
    <div className={cn('relative inline-block', className)}>
      <ShadcnAvatar
        className={cn(
          containerSizeClass,
          contrastBorder && 'ring-2 ring-background',
          focusable && 'cursor-pointer focus:ring-2 focus:ring-ring focus:outline-hidden',
        )}
      >
        {src ? <AvatarImage src={src} alt={alt} /> : null}

        <AvatarFallback className="bg-secondary text-secondary-foreground">
          {initials ? (
            initials
          ) : PlaceholderIcon ? (
            <PlaceholderIcon className="size-1/2" />
          ) : (
            // Default generic user icon
            <svg className="size-1/2 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </AvatarFallback>
      </ShadcnAvatar>

      {/* Status Indicators */}
      {status && (
        <span
          className={cn(
            'absolute right-0 bottom-0 block size-2.5 translate-x-1/4 translate-y-1/4 transform rounded-full ring-2 ring-white',
            status === 'online' && 'bg-green-500',
            status === 'offline' && 'bg-gray-400',
            status === 'busy' && 'bg-red-500',
            status === 'away' && 'bg-yellow-500',
          )}
        />
      )}

      {verified && (
        <span className="absolute right-0 bottom-0 block flex size-3.5 translate-x-1/4 translate-y-1/4 transform items-center justify-center rounded-full bg-blue-500 text-white ring-2 ring-white">
          <svg
            width="8"
            height="6"
            viewBox="0 0 8 6"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 3L3 5L7 1"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}

      {/* Badge slot */}
      {badge && (
        <div className="absolute right-0 bottom-0 translate-x-1/3 translate-y-1/3 transform">
          {badge}
        </div>
      )}
    </div>
  );
};

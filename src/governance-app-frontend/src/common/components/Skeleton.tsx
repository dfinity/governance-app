import { cn } from '@common/utils/shadcn';

/**
 * A placeholder bar.
 *
 * The look and the timing live in the `.skeleton` class in `main.css`: the bar
 * holds its space from the first frame and stays invisible for a short delay,
 * so a fast query resolves into content without a grey flash and without a
 * jump. Pass size classes only; the colour comes from the theme.
 *
 * The bar is decorative. Wrap a group of them in `SkeletonScreen` so screen
 * readers hear one "loading" for the region instead of one per bar.
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden={true}
      className={cn('skeleton rounded-md', className)}
      {...props}
    />
  );
}

export { Skeleton };

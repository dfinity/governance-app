import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { useEffect, useMemo, useRef } from 'react';

import { formatNumber } from '@utils/numbers';
import { cn } from '@utils/shadcn';

type AnimatedNumberProps = {
  value: number;
  prefix?: string;
  suffix?: string;
  formatter?: (value: number) => string;
  formatOptions?: { minFraction: number; maxFraction: number };
  duration?: number;
  className?: string;
} & Omit<React.ComponentProps<'span'>, 'children'>;

const DEFAULT_DURATION = 1.2;

function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  formatter,
  formatOptions = { minFraction: 0, maxFraction: 0 },
  duration = DEFAULT_DURATION,
  className,
  ...props
}: AnimatedNumberProps) {
  const previousValue = useRef(0);
  const targetValue = useRef(0);
  const progress = useMotionValue(0);

  useEffect(() => {
    previousValue.current =
      previousValue.current + (targetValue.current - previousValue.current) * progress.get();
    targetValue.current = value;
    progress.jump(0);
    animate(progress, 1, { duration, ease: [0.16, 1, 0.3, 1] });
  }, [progress, value, duration]);

  const display = useTransform(progress, (t) => {
    const current = previousValue.current + (value - previousValue.current) * t;
    const formatted = formatter ? formatter(current) : formatNumber(current, formatOptions);
    return `${prefix}${formatted}${suffix}`;
  });

  const finalDisplay = useMemo(() => {
    const formatted = formatter ? formatter(value) : formatNumber(value, formatOptions);
    return `${prefix}${formatted}${suffix}`;
  }, [value, prefix, suffix, formatter, formatOptions]);

  return (
    <span className={cn('relative inline-flex', className)} {...props}>
      <span className="invisible" aria-hidden="true">
        {finalDisplay}
      </span>
      <motion.span className="absolute inset-0">{display}</motion.span>
    </span>
  );
}

export { AnimatedNumber };

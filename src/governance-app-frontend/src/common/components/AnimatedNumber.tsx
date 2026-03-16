import { motion, useSpring, useTransform } from 'motion/react';
import { useEffect, useMemo, useRef } from 'react';

import { formatNumber } from '@utils/numbers';
import { cn } from '@utils/shadcn';

type AnimatedNumberProps = {
  value: number;
  prefix?: string;
  suffix?: string;
  formatter?: (value: number) => string;
  formatOptions?: { minFraction: number; maxFraction: number };
  springConfig?: { stiffness: number; damping: number };
  className?: string;
} & Omit<React.ComponentProps<'span'>, 'children'>;

const DEFAULT_SPRING_CONFIG = { stiffness: 80, damping: 35 };

function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  formatter,
  formatOptions = { minFraction: 0, maxFraction: 0 },
  springConfig = DEFAULT_SPRING_CONFIG,
  className,
  ...props
}: AnimatedNumberProps) {
  const previousValue = useRef(0);
  const targetValue = useRef(0);
  const progress = useSpring(0, springConfig);

  useEffect(() => {
    previousValue.current =
      previousValue.current + (targetValue.current - previousValue.current) * progress.get();
    targetValue.current = value;
    progress.jump(0);
    progress.set(1);
  }, [progress, value]);

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
    <span className="relative inline-flex">
      <span className="invisible" aria-hidden="true">
        {finalDisplay}
      </span>
      <motion.span className={cn('absolute inset-0', className)} {...props}>
        {display}
      </motion.span>
    </span>
  );
}

export { AnimatedNumber };

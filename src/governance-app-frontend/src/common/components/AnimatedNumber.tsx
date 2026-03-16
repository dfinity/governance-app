import { motion, useSpring, useTransform } from 'motion/react';
import { useEffect, useRef } from 'react';

import { formatNumber } from '@utils/numbers';

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
  const progress = useSpring(0, springConfig);

  useEffect(() => {
    previousValue.current = progress.get() * previousValue.current || 0;
    progress.jump(0);
    progress.set(1);
  }, [progress, value]);

  const display = useTransform(progress, (t) => {
    const current = previousValue.current + (value - previousValue.current) * t;
    const formatted = formatter ? formatter(current) : formatNumber(current, formatOptions);
    return `${prefix}${formatted}${suffix}`;
  });

  return (
    <motion.span className={className} {...props}>
      {display}
    </motion.span>
  );
}

export { AnimatedNumber };

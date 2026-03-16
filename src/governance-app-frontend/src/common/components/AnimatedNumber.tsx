import { motion, type MotionValue, useSpring, useTransform } from 'motion/react';
import { useEffect } from 'react';

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

const DEFAULT_SPRING_CONFIG = { stiffness: 100, damping: 20 };

function useAnimatedValue(
  value: number,
  springConfig: { stiffness: number; damping: number },
): MotionValue<number> {
  const spring = useSpring(0, springConfig);

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return spring;
}

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
  const spring = useAnimatedValue(value, springConfig);

  const display = useTransform(spring, (current) => {
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

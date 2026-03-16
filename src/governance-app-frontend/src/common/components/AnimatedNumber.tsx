import { motion, useSpring, useTransform } from 'motion/react';
import { useEffect } from 'react';

import { formatNumber } from '@utils/numbers';

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  formatOptions?: { minFraction: number; maxFraction: number };
  className?: string;
  duration?: number;
}

export const AnimatedNumber = ({
  value,
  prefix = '',
  formatOptions = { minFraction: 0, maxFraction: 0 },
  className,
  duration = 1.2,
}: AnimatedNumberProps) => {
  const spring = useSpring(0, {
    stiffness: 50,
    damping: 20,
    duration,
  });

  const display = useTransform(spring, (current) => {
    return `${prefix}${formatNumber(current, formatOptions)}`;
  });

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span className={className}>{display}</motion.span>;
};

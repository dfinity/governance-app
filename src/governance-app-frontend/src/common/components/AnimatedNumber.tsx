import { animate, type HTMLMotionProps, motion, useMotionValue, useTransform } from 'motion/react';
import { useEffect, useMemo, useRef } from 'react';

import { cn } from '@utils/shadcn';

type AnimatedNumberProps = {
  value: number;
  prefix?: string;
  suffix?: string;
  formatter?: (value: number) => string;
  formatOptions?: { minFraction: number; maxFraction: number };
  duration?: number;
  className?: string;
} & Omit<HTMLMotionProps<'span'>, 'children'>;

const DEFAULT_DURATION = 1.2;
const DEFAULT_FORMAT_OPTIONS = { minFraction: 0, maxFraction: 0 };

function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  formatter,
  formatOptions = DEFAULT_FORMAT_OPTIONS,
  duration = DEFAULT_DURATION,
  className,
  ...props
}: AnimatedNumberProps) {
  const previousValue = useRef(0);
  const targetValue = useRef(0);
  const progress = useMotionValue(0);

  const numberFormat = useMemo(
    () =>
      new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: formatOptions.minFraction,
        maximumFractionDigits: formatOptions.maxFraction,
      }),
    [formatOptions.minFraction, formatOptions.maxFraction],
  );

  const formatValue = (v: number) =>
    formatter ? formatter(v) : numberFormat.format(v).replace(/\s/g, '\u2019').replace(',', '.');

  useEffect(() => {
    previousValue.current =
      previousValue.current + (targetValue.current - previousValue.current) * progress.get();
    targetValue.current = value;
    progress.jump(0);
    animate(progress, 1, { duration, ease: [0.16, 1, 0.3, 1] });
  }, [progress, value, duration]);

  const display = useTransform(progress, (t) => {
    const current = previousValue.current + (value - previousValue.current) * t;
    return `${prefix}${formatValue(current)}${suffix}`;
  });

  const finalDisplay = useMemo(() => {
    return `${prefix}${formatValue(value)}${suffix}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, prefix, suffix, formatter, numberFormat]);

  return (
    <motion.span className={cn('relative inline-flex', className)} {...props}>
      <span className="invisible" aria-hidden="true">
        {finalDisplay}
      </span>
      <motion.span className="absolute inset-0">{display}</motion.span>
    </motion.span>
  );
}

export { AnimatedNumber };

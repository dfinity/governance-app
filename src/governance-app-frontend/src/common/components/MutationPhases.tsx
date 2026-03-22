import { AlertTriangle, Loader } from 'lucide-react';
import { motion } from 'motion/react';

import { cn } from '@utils/shadcn';

import { AnimatedCheckmark } from './AnimatedCheckmark';

export function PhaseContainer({
  children,
  className,
  ...props
}: React.ComponentProps<typeof motion.div>) {
  return (
    <motion.div
      className={cn('flex min-h-[200px] flex-col pb-4 text-center md:pb-0', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedSpinner() {
  return (
    <motion.div
      className="flex size-16 items-center justify-center rounded-full bg-primary/10"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
    >
      <Loader className="size-8 animate-spin text-primary" />
    </motion.div>
  );
}

export function AnimatedSuccessIcon() {
  return (
    <motion.div
      className="flex size-16 items-center justify-center rounded-full bg-green-600/10"
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
    >
      <AnimatedCheckmark />
    </motion.div>
  );
}

export function AnimatedErrorIcon() {
  return (
    <motion.div
      className="flex size-14 items-center justify-center rounded-full bg-destructive/10"
      initial={{ scale: 0.8, rotate: 0 }}
      animate={{ scale: 1, rotate: [0, -5, 5, -5, 5, 0] }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <AlertTriangle className="size-8 text-destructive" />
    </motion.div>
  );
}

export function FadeInText({
  children,
  delay,
  className,
}: {
  children: React.ReactNode;
  delay: number;
  className?: string;
}) {
  return (
    <motion.p
      className={cn('text-sm font-medium text-muted-foreground', className)}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      {children}
    </motion.p>
  );
}

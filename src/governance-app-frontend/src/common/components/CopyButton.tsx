import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@components/button';
import { cn } from '@utils/shadcn';

type Props = {
  className?: string;
  disabled?: boolean;
  onCopy?: () => void;
  value: string;
};

const ANIMATION_DURATION = 3000;

export const CopyButton = ({ value, onCopy, className, disabled }: Props) => {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isCopied) {
      const timeout = setTimeout(() => {
        setIsCopied(false);
      }, ANIMATION_DURATION);
      return () => clearTimeout(timeout);
    }
  }, [isCopied]);

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setIsCopied(true);

    onCopy?.();
  };

  return (
    <Button
      variant="outline"
      size="icon-lg"
      onClick={handleCopy}
      disabled={isCopied || disabled}
      className={cn(
        'transition-colors duration-200 disabled:opacity-100',
        isCopied &&
          'border-emerald-800 bg-green-50 text-emerald-900 hover:bg-green-50 dark:border-emerald-400 dark:text-emerald-400',
        className,
      )}
    >
      <div className="relative flex items-center justify-center">
        <Copy
          className={cn(
            'absolute size-4 transition-all duration-300',
            isCopied ? 'scale-0 opacity-0' : 'scale-100 opacity-100',
          )}
        />
        <Check
          className={cn(
            'size-4 transition-all duration-300',
            isCopied ? 'scale-100 opacity-100' : 'scale-0 opacity-0',
          )}
        />
      </div>
    </Button>
  );
};

import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { successNotification } from '@utils/notification';
import { cn } from '@utils/shadcn';

type Props = {
  className?: string;
  disabled?: boolean;
  label: string;
  onCopy?: () => void;
  value: string;
};

const ANIMATION_DURATION = 3000;

export const CopyButton = ({ value, onCopy, className, disabled, label }: Props) => {
  const { t } = useTranslation();
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

    successNotification({
      description: t(($) => $.common.copiedToClipboard, {
        label,
      }),
    });

    onCopy?.();
  };

  return (
    <Button
      variant="outline"
      size="icon-lg"
      onClick={handleCopy}
      disabled={isCopied || disabled}
      aria-label={
        isCopied
          ? t(($) => $.common.copiedToClipboard, {
              label,
            })
          : t(($) => $.common.copyToClipboard)
      }
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
          aria-hidden="true"
        />
        <Check
          className={cn(
            'size-4 transition-all duration-300',
            isCopied ? 'scale-100 opacity-100' : 'scale-0 opacity-0',
          )}
          aria-hidden="true"
        />
      </div>
    </Button>
  );
};

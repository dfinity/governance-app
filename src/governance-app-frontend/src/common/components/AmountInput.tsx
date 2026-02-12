import { nonNullish } from '@dfinity/utils';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { Input } from '@components/Input';
import { cn } from '@utils/shadcn';

type AmountInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** The maximum amount available for selection. Enables the Max button. */
  maxAmount?: number;
  /** Called when the Max button is clicked with the max value as a string. */
  onMaxSelect?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  /** Approximate USD value label, e.g. "~ $12.34" */
  approxUsdLabel?: string;
  /** Available balance label shown on the right, e.g. "Available: 12.345 ICP" */
  availableLabel?: string;
  availableLabelTestId?: string;
  'data-testid'?: string;
};

export const AmountInput = React.forwardRef<HTMLInputElement, AmountInputProps>(
  (
    {
      id,
      value,
      onChange,
      maxAmount,
      onMaxSelect,
      disabled,
      required,
      approxUsdLabel,
      availableLabel,
      availableLabelTestId,
      'data-testid': testId,
    },
    ref,
  ) => {
    const { t } = useTranslation();

    const showMax = nonNullish(maxAmount) && nonNullish(onMaxSelect);
    const showBottomRow = Boolean(
      nonNullish(approxUsdLabel) || nonNullish(availableLabel) || showMax,
    );

    return (
      <div className="space-y-2">
        <div className="relative">
          <Input
            className={cn(
              'h-14 [appearance:textfield] border-2 pr-28 !text-lg font-semibold focus-visible:ring-0',
              '[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
            )}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0.00"
            id={id}
            ref={ref}
            value={value}
            type="number"
            inputMode="decimal"
            step="any"
            disabled={disabled}
            required={required}
            data-testid={testId}
          />
          <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1.5">
            <img src="/icp-token.svg" alt="" aria-hidden={true} className="h-6 w-6" />
            <span className="text-sm font-semibold text-muted-foreground">
              {t(($) => $.common.icp)}
            </span>
          </div>
        </div>

        {showBottomRow && (
          <div className="flex items-center justify-between">
            {approxUsdLabel ? (
              <p className="text-sm text-muted-foreground">{approxUsdLabel}</p>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-1">
              {availableLabel && (
                <p className="text-sm text-muted-foreground" data-testid={availableLabelTestId}>
                  {availableLabel}
                </p>
              )}
              {showMax && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onMaxSelect(Math.max(0, maxAmount).toString())}
                  disabled={disabled}
                  className="h-auto px-1.5 py-0.5 text-xs font-semibold text-primary uppercase"
                >
                  {t(($) => $.common.max)}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  },
);

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Input, type InputBaseProps } from '@untitledui/components/base/input/input';
import { TFunction } from 'i18next';
import React from 'react';

type Props = Omit<InputBaseProps, 'value' | 'onChange'> & {
  min?: number;
  max?: number;
  value?: number;
  minErrorMessage?: string;
  maxErrorMessage?: string;
  infiniteValueMessage?: string;
  invalidNumberMessage?: string;
  onChange?: (value: number | undefined) => void;
};

const NumberInput: React.FC<Props> = (props) => {
  const { value, onChange, hint, isInvalid } = props;

  const [internalValue, setInternalValue] = useState<string>(value ? String(value) : '');
  const [errorMessage, setErrorMessage] = useState<string>();
  const { t } = useTranslation();

  // Update internal value when external value changes.
  useEffect(() => {
    setInternalValue(value ? String(value) : '');
  }, [value]);

  const handleChange = (inputValue: string) => {
    setInternalValue(inputValue);
    const { error, numericValue } = validateNumberInput({ inputValue, t, ...props });
    setErrorMessage(error);
    onChange?.(numericValue);
  };

  return (
    <Input
      {...props}
      isInvalid={!!errorMessage || isInvalid}
      hint={errorMessage ?? hint}
      onChange={handleChange}
      value={internalValue}
      type="number"
    />
  );
};

export { NumberInput };

const validateNumberInput = ({
  inputValue,
  t,
  min,
  max,
  ...messages
}: Props & {
  inputValue: string;
  t: TFunction;
}): { error?: string; numericValue?: number } => {
  // Empty value is valid.
  if (inputValue === '' || inputValue === '-' || inputValue === '.') {
    return { error: undefined, numericValue: undefined };
  }

  const numericValue = Number(inputValue);

  // Check if it's a valid number.
  if (isNaN(numericValue)) {
    const error = messages.invalidNumberMessage ?? t(($) => $.common.numberInput.invalidNumber);
    return { error, numericValue: undefined };
  }

  // Check if it's a finite number.
  if (!isFinite(numericValue)) {
    const error = messages.infiniteValueMessage ?? t(($) => $.common.numberInput.infiniteValue);
    return { error, numericValue: undefined };
  }

  // Check min constraint.
  if (min !== undefined && numericValue < min) {
    const error = messages.minErrorMessage ?? t(($) => $.common.numberInput.minValueError, { min });
    return { error, numericValue };
  }

  // Check max constraint
  if (max !== undefined && numericValue > max) {
    const error = messages.maxErrorMessage ?? t(($) => $.common.numberInput.maxValueError, { max });
    return { error, numericValue };
  }

  return { error: undefined, numericValue };
};

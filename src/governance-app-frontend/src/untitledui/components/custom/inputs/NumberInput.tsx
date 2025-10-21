import { Input, type InputBaseProps } from '@untitledui/components/base/input/input';
import React, { useEffect, useState } from 'react';
import { clampNumber } from '@utils/numbers';
import { KeyboardEvent } from '@react-types/shared';
import { nonNullish } from '@dfinity/utils';

type Props = Omit<InputBaseProps, 'value' | 'onChange'> & {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
};

// BE CAREFUL CHANGING THIS COMPONENT:
// There are a lot of edge cases to consider.
export const NumberInput: React.FC<Props> = (props) => {
  const { value, onChange, min, max, ...baseProps } = props;
  const [internalValue, setInternalValue] = useState('');

  // Ensure values coming externally are within the min and max bounds.
  useEffect(() => {
    const acceptableNumber = clampNumber({ val: value, min, max });
    if (acceptableNumber !== value) {
      onChange(acceptableNumber);
    } else {
      setInternalValue(nonNullish(value) ? String(value) : '');
    }
  }, [value, min, max, onChange]);

  const handleChange = (inputValue: string) => {
    // If the input is cleared, don't clamp it as it would restore the min value.
    if (inputValue === '') {
      onChange(undefined);
      setInternalValue('');
      return;
    }

    // If the input is ending with a decimal point and a zero, allow it without clamping yet (as it would trigger the number conversion and remove the zeroes).
    if (/\.(.*)0$/.test(inputValue)) {
      setInternalValue(inputValue);
      return;
    }

    const val = clampNumber({ val: Number(inputValue), min, max });
    if (val !== value) onChange(val);
    setInternalValue(String(val));
  };

  // Prevents scientific notation and negative numbers.
  const handleKeyDown = (event: KeyboardEvent) => {
    if (['e', '-', '+'].includes(event.key)) event.preventDefault();
  };

  console.log('internalValue', internalValue);
  return (
    <Input
      isInvalid={false} // Avoids a bug when increasing the number with the arrows. Always valid anyway since the number is clamped. Can be overridden from the props if needed.
      {...baseProps}
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      value={internalValue}
      type="number"
    />
  );
};

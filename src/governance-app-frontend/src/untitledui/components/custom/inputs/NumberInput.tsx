import { Input, type InputBaseProps } from '@untitledui/components/custom/base/input/input';
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

// BE CAREFUL CHANGING THIS COMPONENT!
// There are a ton of edge cases to consider.
export const NumberInput: React.FC<Props> = (props) => {
  const { value: externalValue, onChange, min, max, ...baseProps } = props;
  const [internalValue, setInternalValue] = useState('');

  // Ensure values coming externally are within the min and max bounds.
  useEffect(() => {
    const acceptableNumber = clampNumber({ val: externalValue, min, max });
    // If the value has changed and is out of bounds, call the onChange callback with the clamped value.
    if (acceptableNumber !== externalValue) {
      onChange(acceptableNumber);
    } else {
      if (nonNullish(externalValue)) {
        // If the value is defined and within bounds, update the internal value.
        // Only update if the Number-converted values are different (in order to keep pasted numbers trailing decimal zeroes).
        if (Number(externalValue) !== Number(internalValue)) {
          setInternalValue(String(externalValue));
        }
      } else {
        // If the value is undefined, clear the input.
        setInternalValue('');
      }
    }
  }, [externalValue, min, max, onChange]);

  const handleChange = (inputString: string) => {
    // If the input is cleared, don't try to clamp it as it would treat it as zero (Number('')).
    if (inputString === '') {
      onChange(undefined);
      setInternalValue('');
      return;
    }

    // Clamp the value to the min and max bounds.
    const inputAsNumber = Number(inputString);
    const clampedInputAsNumber = clampNumber({ val: inputAsNumber, min, max });

    // If the input is ending with a decimal zero, and is withing the min and max bounds,
    // then allow it without clamping yet (as it would trigger the number conversion and remove the zeroes).
    if (/\.(.*)0$/.test(inputString) && clampedInputAsNumber === inputAsNumber) {
      setInternalValue(inputString);
      // If the value has changed, call the onChange callback (e.g. was pasted with trailing decimal zeroes).
      if (inputAsNumber !== externalValue) onChange(clampedInputAsNumber);
      return;
    }

    // If the value has changed, the onChange callback.
    if (clampedInputAsNumber !== externalValue) onChange(clampedInputAsNumber);
    setInternalValue(String(clampedInputAsNumber));
  };

  // Prevents scientific notation and negative numbers from being typed.
  // In case they are pasted, they are immedately converted, and display as regular numbers.
  const handleKeyDown = (event: KeyboardEvent) => {
    if (['e', '-', '+'].includes(event.key)) event.preventDefault();
  };

  return (
    <Input
      {...baseProps}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      value={internalValue}
      type="number"
      // Allow any decimal precision, otherwise is considered invalid when decimals are present.
      step="any"
    />
  );
};

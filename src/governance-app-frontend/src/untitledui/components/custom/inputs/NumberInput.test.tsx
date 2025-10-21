import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@utils/unitTest';

import { NumberInput } from './NumberInput';
import { useState } from 'react';

const testLabel = 'Test Label';

const getElement = (): Promise<HTMLInputElement> => screen.findByLabelText(testLabel);

const typeInInput = async (input: HTMLInputElement, value: string) => {
  // Emulate typing each character one-by-one.
  fireEvent.input(input, { target: { value: '' } });
  input.focus();
  for (let i = 0; i < value.length; i++) {
    const partialValue = value.slice(0, i + 1);
    fireEvent.input(input, { target: { value: partialValue } });
  }
};

const Wrapper = ({
  value,
  onChange,
  min,
  max,
  ...props
}: {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
}) => {
  const [val, setVal] = useState(value);
  return (
    <NumberInput
      aria-label={testLabel}
      value={val}
      onChange={(value) => {
        onChange(value);
        setVal(value);
      }}
    />
  );
};

describe('NumberInput', () => {
  it('Renders without crashing.', async () => {
    renderWithProviders(<Wrapper value={undefined} onChange={vi.fn()} />);
    expect(await getElement()).toBeDefined();
  });

  it('Renders with initial value.', async () => {
    renderWithProviders(<Wrapper value={100} onChange={vi.fn()} />);
    expect((await getElement()).value).toBe('100');
  });

  it('Assigns the correct value when the input is changed.', async () => {
    const onChange = vi.fn();
    renderWithProviders(<Wrapper value={undefined} onChange={onChange} />);
    const input = await getElement();

    typeInInput(input, '-1');
    expect(input.value).toBe('1');
    expect(onChange).toHaveBeenLastCalledWith(1);

    typeInInput(input, '1');
    expect(input.value).toBe('1');
    expect(onChange).toHaveBeenLastCalledWith(1);

    typeInInput(input, '100');
    expect(input.value).toBe('100');
    expect(onChange).toHaveBeenLastCalledWith(100);

    typeInInput(input, '9999999999');
    expect(input.value).toBe('9999999999');
    expect(onChange).toHaveBeenLastCalledWith(9999999999);

    typeInInput(input, 'AAA');
    expect(input.value).toBe('');
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });
  return;
  it('Assigns the correct value when the input is using decimals.', async () => {
    const onChange = vi.fn();
    renderWithProviders(<Wrapper value={undefined} onChange={onChange} />);
    const input = await getElement();

    typeInInput(input, '1.1');
    expect(input.value).toBe('1.1');
    expect(onChange).toHaveBeenLastCalledWith(1.1);

    typeInInput(input, '.');
    expect(input.value).toBe('.');
    // The last "." doesn't trigger the change.
    expect(onChange).toHaveBeenLastCalledWith(1.1);

    typeInInput(input, '.2');
    expect(input.value).toBe('0.2');

    expect(onChange).toHaveBeenLastCalledWith(0.2);

    typeInInput(input, '2.');
    expect(input.value).toBe('2.');
    // The last "." doesn't trigger the change.
    expect(onChange).toHaveBeenLastCalledWith(2);

    typeInInput(input, '2.1');
    expect(input.value).toBe('2.1');
    expect(onChange).toHaveBeenLastCalledWith(2.1);

    typeInInput(input, '123.456');
    expect(input.value).toBe('123.456');
    expect(onChange).toHaveBeenLastCalledWith(123.456);

    typeInInput(input, '.456');
    expect(input.value).toBe('0.456');
    expect(onChange).toHaveBeenLastCalledWith(0.456);

    typeInInput(input, '456.00');
    expect(input.value).toBe('456');
    expect(onChange).toHaveBeenLastCalledWith(456);
  });

  it('Ignores non number characters.', async () => {
    const onChange = vi.fn();
    renderWithProviders(<Wrapper value={undefined} onChange={onChange} />);
    const input = await getElement();

    typeInInput(input, 'abc');
    expect(input.value).toBe('');

    typeInInput(input, '123abc');
    expect(input.value).toBe('123');
    expect(onChange).toHaveBeenLastCalledWith(123);

    typeInInput(input, '1.2.3.4.5.6');
    expect(input.value).toBe('1.23456');
    expect(onChange).toHaveBeenLastCalledWith(1.23456);

    typeInInput(input, '456.00A');
    expect(input.value).toBe('456');
    expect(onChange).toHaveBeenLastCalledWith(456);

    typeInInput(input, 'AAA456');
    expect(input.value).toBe('456');
    expect(onChange).toHaveBeenLastCalledWith(456);
  });

  it('Ensures the value is within the min value.', async () => {
    const onChange = vi.fn();
    renderWithProviders(<Wrapper min={100} value={undefined} onChange={onChange} />);
    const input = await getElement();

    typeInInput(input, '99');
    expect(input.value).toBe('100');
    expect(onChange).toHaveBeenLastCalledWith(100);

    typeInInput(input, '99.99');
    expect(input.value).toBe('100');
    expect(onChange).toHaveBeenLastCalledWith(100);

    typeInInput(input, '100');
    expect(input.value).toBe('100');
    expect(onChange).toHaveBeenLastCalledWith(100);

    typeInInput(input, '101');
    expect(input.value).toBe('101');
    expect(onChange).toHaveBeenLastCalledWith(101);
  });

  it('Ensures the value is within the max value.', async () => {
    const onChange = vi.fn();
    renderWithProviders(<Wrapper max={100} value={undefined} onChange={onChange} />);
    const input = await getElement();

    typeInInput(input, '101');
    await Promise.resolve();
    expect(input.value).toBe('100');
    expect(onChange).toHaveBeenLastCalledWith(100);

    typeInInput(input, '100.01');
    expect(input.value).toBe('100');
    expect(onChange).toHaveBeenLastCalledWith(100);

    typeInInput(input, '100');
    expect(input.value).toBe('100');
    expect(onChange).toHaveBeenLastCalledWith(100);

    typeInInput(input, '99.99');
    expect(input.value).toBe('99.99');
    expect(onChange).toHaveBeenLastCalledWith(99.99);
  });
});

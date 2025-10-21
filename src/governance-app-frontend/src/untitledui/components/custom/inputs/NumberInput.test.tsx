import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { changeInputValue, renderWithProviders } from '@utils/unitTest';

import { NumberInput } from './NumberInput';
import { useState } from 'react';

const testLabel = 'NumberInputTestLabel';

const getElement = (): Promise<HTMLInputElement> => screen.findByLabelText(testLabel);

const Wrapper = ({
  value,
  onChange,
  min,
  max,
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
      min={min}
      max={max}
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

  it('Renders with the initial value.', async () => {
    renderWithProviders(<Wrapper value={100} onChange={vi.fn()} />);
    expect((await getElement()).value).toBe('100');
  });

  it('Throws an error if the min value is greater or equal to the max value.', async () => {
    expect(() =>
      renderWithProviders(<Wrapper min={0.1} max={0.01} value={undefined} onChange={vi.fn()} />),
    ).toThrow();

    expect(() =>
      renderWithProviders(<Wrapper min={1} max={0} value={undefined} onChange={vi.fn()} />),
    ).toThrow();

    expect(() =>
      renderWithProviders(<Wrapper min={10} max={1} value={undefined} onChange={vi.fn()} />),
    ).toThrow();

    expect(() =>
      renderWithProviders(<Wrapper min={0.01} max={0.01} value={undefined} onChange={vi.fn()} />),
    ).toThrow();

    expect(() =>
      renderWithProviders(<Wrapper min={1} max={1} value={undefined} onChange={vi.fn()} />),
    ).toThrow();

    expect(() =>
      renderWithProviders(<Wrapper min={0.01} max={0.1} value={undefined} onChange={vi.fn()} />),
    ).not.toThrow();
  });

  it('Assigns the correct value when the input is changed.', async () => {
    const onChange = vi.fn();
    renderWithProviders(<Wrapper value={undefined} onChange={onChange} />);
    const input = await getElement();

    changeInputValue(input, '-1');
    expect(input.value).toBe('-1');
    expect(onChange).toHaveBeenLastCalledWith(-1);

    changeInputValue(input, '1');
    expect(input.value).toBe('1');
    expect(onChange).toHaveBeenLastCalledWith(1);

    changeInputValue(input, '100');
    expect(input.value).toBe('100');
    expect(onChange).toHaveBeenLastCalledWith(100);

    changeInputValue(input, '9999999999');
    expect(input.value).toBe('9999999999');
    expect(onChange).toHaveBeenLastCalledWith(9999999999);

    changeInputValue(input, 'AAA');
    expect(input.value).toBe('');
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it('Assigns the correct value when the input is using decimals.', async () => {
    const onChange = vi.fn();
    renderWithProviders(<Wrapper value={undefined} onChange={onChange} />);
    const input = await getElement();

    changeInputValue(input, '1.1');
    expect(input.value).toBe('1.1');
    expect(onChange).toHaveBeenLastCalledWith(1.1);

    changeInputValue(input, '.');
    expect(input.value).toBe('');
    expect(onChange).toHaveBeenLastCalledWith(undefined);

    changeInputValue(input, '.2');
    expect(input.value).toBe('0.2');
    expect(onChange).toHaveBeenLastCalledWith(0.2);

    changeInputValue(input, '2.1');
    expect(input.value).toBe('2.1');
    expect(onChange).toHaveBeenLastCalledWith(2.1);

    changeInputValue(input, '123.456');
    expect(input.value).toBe('123.456');
    expect(onChange).toHaveBeenLastCalledWith(123.456);

    changeInputValue(input, '.456');
    expect(input.value).toBe('0.456');
    expect(onChange).toHaveBeenLastCalledWith(0.456);

    changeInputValue(input, '456.00');
    expect(input.value).toBe('456.00');
    expect(onChange).toHaveBeenLastCalledWith(456);

    changeInputValue(input, '456.00000001');
    expect(input.value).toBe('456.00000001');
    expect(onChange).toHaveBeenLastCalledWith(456.00000001);
  });

  it('Ensures the value is greater than or equal to the min value.', async () => {
    const onChange = vi.fn();
    renderWithProviders(<Wrapper min={100} value={undefined} onChange={onChange} />);
    const input = await getElement();

    changeInputValue(input, '99');
    expect(input.value).toBe('100');
    expect(onChange).toHaveBeenLastCalledWith(100);

    changeInputValue(input, '99.99');
    expect(input.value).toBe('100');
    expect(onChange).toHaveBeenLastCalledWith(100);

    changeInputValue(input, '100');
    expect(input.value).toBe('100');
    expect(onChange).toHaveBeenLastCalledWith(100);

    changeInputValue(input, '101');
    expect(input.value).toBe('101');
    expect(onChange).toHaveBeenLastCalledWith(101);
  });

  it('Ensures the value is less than or equal to the max value.', async () => {
    const onChange = vi.fn();
    renderWithProviders(<Wrapper max={100} value={undefined} onChange={onChange} />);
    const input = await getElement();

    changeInputValue(input, '101');
    expect(input.value).toBe('100');
    expect(onChange).toHaveBeenLastCalledWith(100);

    changeInputValue(input, '100.01');
    expect(input.value).toBe('100');
    expect(onChange).toHaveBeenLastCalledWith(100);

    changeInputValue(input, '100');
    expect(input.value).toBe('100');
    expect(onChange).toHaveBeenLastCalledWith(100);

    changeInputValue(input, '99.99');
    expect(input.value).toBe('99.99');
    expect(onChange).toHaveBeenLastCalledWith(99.99);
  });

  it('Ensures the value is within both the min and max bounds.', async () => {
    const onChange = vi.fn();
    renderWithProviders(<Wrapper min={0.5} max={99.5} value={undefined} onChange={onChange} />);
    const input = await getElement();

    changeInputValue(input, '-5');
    expect(input.value).toBe('0.5');
    expect(onChange).toHaveBeenLastCalledWith(0.5);

    changeInputValue(input, '0');
    expect(input.value).toBe('0.5');
    expect(onChange).toHaveBeenLastCalledWith(0.5);

    changeInputValue(input, '0.0000001');
    expect(input.value).toBe('0.5');
    expect(onChange).toHaveBeenLastCalledWith(0.5);

    changeInputValue(input, '0.4999999');
    expect(input.value).toBe('0.5');
    expect(onChange).toHaveBeenLastCalledWith(0.5);

    changeInputValue(input, '0.5');
    expect(input.value).toBe('0.5');
    expect(onChange).toHaveBeenLastCalledWith(0.5);

    changeInputValue(input, '0.5000001');
    expect(input.value).toBe('0.5000001');
    expect(onChange).toHaveBeenLastCalledWith(0.5000001);

    changeInputValue(input, '0.9999999');
    expect(input.value).toBe('0.9999999');
    expect(onChange).toHaveBeenLastCalledWith(0.9999999);

    changeInputValue(input, '1');
    expect(input.value).toBe('1');
    expect(onChange).toHaveBeenLastCalledWith(1);

    changeInputValue(input, '1.0000001');
    expect(input.value).toBe('1.0000001');
    expect(onChange).toHaveBeenLastCalledWith(1.0000001);

    changeInputValue(input, '99.4999999');
    expect(input.value).toBe('99.4999999');
    expect(onChange).toHaveBeenLastCalledWith(99.4999999);

    changeInputValue(input, '99.5');
    expect(input.value).toBe('99.5');
    expect(onChange).toHaveBeenLastCalledWith(99.5);

    changeInputValue(input, '99.5000001');
    expect(input.value).toBe('99.5');
    expect(onChange).toHaveBeenLastCalledWith(99.5);

    changeInputValue(input, '99.99');
    expect(input.value).toBe('99.5');
    expect(onChange).toHaveBeenLastCalledWith(99.5);

    changeInputValue(input, '100');
    expect(input.value).toBe('99.5');
    expect(onChange).toHaveBeenLastCalledWith(99.5);

    changeInputValue(input, '100.0000001');
    expect(input.value).toBe('99.5');
    expect(onChange).toHaveBeenLastCalledWith(99.5);
  });
});

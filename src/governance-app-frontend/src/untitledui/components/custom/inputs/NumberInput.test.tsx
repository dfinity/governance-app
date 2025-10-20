import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@utils/unitTest';

import { NumberInput } from './NumberInput';

const testLabel = 'Test Label';

const getElement = (label: string) => {
  return screen.findByLabelText(label) as Promise<HTMLInputElement>;
};

const changeInput = async (input: HTMLInputElement, value: string) => {
  fireEvent.change(input, { target: { value } });
};

describe('NumberInput', () => {
  it('Renders without crashing.', async () => {
    renderWithProviders(<NumberInput aria-label={testLabel} />);
    expect(await getElement(testLabel)).toBeDefined();
  });

  it('Renders with initial value.', async () => {
    renderWithProviders(<NumberInput value={42} aria-label={testLabel} />);
    expect((await getElement(testLabel)).value).toBe('42');
  });

  it('Assigns the correct value when the input is changed.', async () => {
    renderWithProviders(<NumberInput aria-label={testLabel} />);
    const input = await getElement(testLabel);
    changeInput(input, '42');
    expect(input.value).toBe('42');
    changeInput(input, '100');
    expect(input.value).toBe('100');
    changeInput(input, '200');
    expect(input.value).toBe('200');
    changeInput(input, '250');
    expect(input.value).toBe('250');
    changeInput(input, '300');
    expect(input.value).toBe('300');
    changeInput(input, '350');
    expect(input.value).toBe('350');
  });

  it('Handles invalid input when the input is not a number.', async () => {
    renderWithProviders(<NumberInput aria-label={testLabel} />);
    const input = await getElement(testLabel);
    changeInput(input, 'abc');
    expect(input.value).toBe('');
    changeInput(input, '123abc');
    expect(input.value).toBe('');
    changeInput(input, '1.2.3.4.5.6');
    expect(input.value).toBe('');
    changeInput(input, '123.456');
    expect(input.value).toBe('123.456');
    changeInput(input, '.456');
    expect(input.value).toBe('.456');
    changeInput(input, '-456');
    expect(input.value).toBe('-456');
    changeInput(input, '456.00');
    expect(input.value).toBe('456.00');
    changeInput(input, '456.00A');
    expect(input.value).toBe('');
  });

  it('Shows an error when the input is below the min value.', async () => {
    renderWithProviders(<NumberInput min={100} aria-label={testLabel} />);
    const input = await getElement(testLabel);
    changeInput(input, '99');
    expect(await screen.findByText('Min values is: 100.')).toBeDefined();
    expect(input.value).toBe('99');
    changeInput(input, '99.99');
    expect(await screen.findByText('Min values is: 100.')).toBeDefined();
    expect(input.value).toBe('99.99');
    changeInput(input, '100');
    expect(screen.queryByText('Min values is: 100.')).toBeNull();
    expect(input.value).toBe('100');
    changeInput(input, '1000');
    expect(screen.queryByText('Min values is: 100.')).toBeNull();
    expect(input.value).toBe('1000');
  });

  it('Shows an error when the input is above the max value.', async () => {
    renderWithProviders(<NumberInput max={100} aria-label={testLabel} />);
    const input = await getElement(testLabel);
    changeInput(input, '101');
    expect(await screen.findByText('Max values is: 100.')).toBeDefined();
    expect(input.value).toBe('101');
    changeInput(input, '100.01');
    expect(await screen.findByText('Max values is: 100.')).toBeDefined();
    expect(input.value).toBe('100.01');
    changeInput(input, '100');
    expect(screen.queryByText('Max values is: 100.')).toBeNull();
    expect(input.value).toBe('100');
    changeInput(input, '99.99');
    expect(screen.queryByText('Max values is: 100.')).toBeNull();
    expect(input.value).toBe('99.99');
  });
});

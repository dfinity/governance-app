import '@/i18n/config';

import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { DestinationInput, type DestinationSuggestion } from './DestinationInput';

const ICP_ADDRESS = 'd4685b31b51450508aff0331584df7692a84467b680326f5c5f7d30ae711682f';
const ICRC1_ADDRESS = 'h4a5i-5vcfo-5rusv-fmb6m-vrkia-mjnkc-jpoow-h5mam-nthnm-ldqlr-bqe';

const SUGGESTIONS: DestinationSuggestion[] = [
  { name: 'Alice', address: ICP_ADDRESS, kind: 'icp' },
  { name: 'Bob', address: ICRC1_ADDRESS, kind: 'icrc1' },
];

const Harness = ({
  suggestions = SUGGESTIONS,
  onAddAddress,
  onChange = () => {},
}: {
  suggestions?: DestinationSuggestion[];
  onAddAddress?: () => void;
  onChange?: (value: string, name: string) => void;
}) => {
  const [value, setValue] = useState('');
  const [name, setName] = useState('');
  return (
    <DestinationInput
      id="destination"
      data-testid="destination"
      value={value}
      selectedName={name}
      suggestions={suggestions}
      onAddAddress={onAddAddress}
      onChange={(nextValue, nextName) => {
        setValue(nextValue);
        setName(nextName);
        onChange(nextValue, nextName);
      }}
    />
  );
};

describe('DestinationInput', () => {
  it('lists all suggestions on focus and filters them by name or address', () => {
    render(<Harness />);
    const input = screen.getByTestId('destination');

    fireEvent.focus(input);
    expect(screen.getAllByRole('option')).toHaveLength(2);

    fireEvent.change(input, { target: { value: 'bo' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option').textContent).toContain('Bob');

    fireEvent.change(input, { target: { value: ICP_ADDRESS.slice(0, 6) } });
    expect(screen.getByRole('option').textContent).toContain('Alice');
  });

  it('keeps a pasted address as typed text', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.change(screen.getByTestId('destination'), { target: { value: ICP_ADDRESS } });

    expect(onChange).toHaveBeenLastCalledWith(ICP_ADDRESS, '');
    expect(screen.getByTestId<HTMLInputElement>('destination').value).toBe(ICP_ADDRESS);
  });

  it('shows the picked suggestion as a chip and clears it', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const input = screen.getByTestId('destination');

    fireEvent.focus(input);
    fireEvent.click(screen.getByText('Bob'));

    expect(onChange).toHaveBeenLastCalledWith(ICRC1_ADDRESS, 'Bob');
    expect(screen.getByTestId('destination-selected').textContent).toContain('Bob');
    expect(screen.queryByTestId('destination')).toBeNull();

    fireEvent.click(screen.getByTestId('destination-clear'));

    expect(onChange).toHaveBeenLastCalledWith('', '');
    expect(screen.getByTestId<HTMLInputElement>('destination').value).toBe('');
  });

  it('starts at the last item on ArrowUp', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const input = screen.getByTestId('destination');

    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenLastCalledWith(ICRC1_ADDRESS, 'Bob');
  });

  it('renders the chip as a labelable element that a click does not clear', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.focus(screen.getByTestId('destination'));
    fireEvent.click(screen.getByText('Alice'));
    onChange.mockClear();

    const chip = screen.getByTestId('destination-selected');
    expect(chip.tagName).toBe('OUTPUT');
    expect(chip.id).toBe('destination');

    fireEvent.click(chip);
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.keyDown(chip, { key: 'Backspace' });
    expect(onChange).toHaveBeenLastCalledWith('', '');
  });

  it('picks a suggestion with the keyboard', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const input = screen.getByTestId('destination');

    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenLastCalledWith(ICRC1_ADDRESS, 'Bob');
  });

  it('closes the list with Escape and does not close the dialog', () => {
    const onEscape = vi.fn();
    render(
      <div onKeyDown={(event) => event.key === 'Escape' && onEscape()}>
        <Harness />
      </div>,
    );
    const input = screen.getByTestId('destination');

    fireEvent.focus(input);
    expect(screen.queryByRole('listbox')).not.toBeNull();

    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onEscape).not.toHaveBeenCalled();
  });

  it('offers the add action after the matches', () => {
    const onAddAddress = vi.fn();
    render(<Harness suggestions={[]} onAddAddress={onAddAddress} />);
    const input = screen.getByTestId('destination');

    fireEvent.focus(input);
    fireEvent.click(screen.getByTestId('destination-add'));

    expect(onAddAddress).toHaveBeenCalledOnce();
  });

  it('exposes the add action as a button outside the arrow-key navigation', () => {
    const onChange = vi.fn();
    render(<Harness onAddAddress={() => {}} onChange={onChange} />);
    const input = screen.getByTestId('destination');

    fireEvent.focus(input);

    expect(screen.getAllByRole('option')).toHaveLength(2);
    const add = screen.getByTestId('destination-add');
    expect(add.tagName).toBe('BUTTON');
    expect(add.getAttribute('role')).toBeNull();

    // Two matches: ArrowDown three times wraps back to the first match.
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(ICP_ADDRESS, 'Alice');
  });

  it('keeps the list open while the focus moves to the add button', () => {
    render(<Harness onAddAddress={() => {}} />);
    const input = screen.getByTestId('destination');

    fireEvent.focus(input);
    const add = screen.getByTestId('destination-add');
    fireEvent.blur(input, { relatedTarget: add });

    expect(screen.getByTestId('destination-add')).toBeDefined();
    expect(screen.queryByRole('listbox')).not.toBeNull();
  });

  it('marks the input as required', () => {
    render(<Harness />);

    expect(screen.getByTestId<HTMLInputElement>('destination').required).toBe(true);
  });

  it('shows no list without suggestions and without the add action', () => {
    render(<Harness suggestions={[]} />);

    fireEvent.focus(screen.getByTestId('destination'));

    expect(screen.queryByRole('listbox')).toBeNull();
  });
});

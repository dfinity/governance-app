import '@/i18n/config';

import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@components/Dialog';

import { DestinationInput, type DestinationSuggestion } from './DestinationInput';

// jsdom has no layout, so the active option scroll is a no-op here.
Element.prototype.scrollIntoView = vi.fn();

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

  it('picks the first match with Enter after a typed name', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const input = screen.getByTestId('destination');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'bo' } });
    expect(input.getAttribute('aria-activedescendant')).toBe(screen.getByRole('option').id);

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenLastCalledWith(ICRC1_ADDRESS, 'Bob');
  });

  it('ignores the Enter that confirms an IME composition', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const input = screen.getByTestId('destination');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'bo' } });
    onChange.mockClear();

    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByTestId('destination-selected')).toBeNull();
  });

  it('keeps a complete address as typed text on Enter', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const input = screen.getByTestId('destination');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: ICRC1_ADDRESS } });
    expect(input.getAttribute('aria-activedescendant')).toBeNull();

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenLastCalledWith(ICRC1_ADDRESS, '');
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

  it('reopens the list with a click after Escape closed it', () => {
    render(<Harness />);
    const input = screen.getByTestId('destination');

    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();

    fireEvent.click(input);
    expect(screen.queryByRole('listbox')).not.toBeNull();
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

  it('ignores a stale active index after the suggestions shrink', () => {
    const onChange = vi.fn();
    const { rerender } = render(<Harness onChange={onChange} />);
    const input = screen.getByTestId('destination');

    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    rerender(<Harness onChange={onChange} suggestions={[SUGGESTIONS[0]]} />);
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('closes the list with Escape on the add button', () => {
    render(<Harness onAddAddress={() => {}} />);
    const input = screen.getByTestId('destination');

    fireEvent.focus(input);
    const add = screen.getByTestId('destination-add');
    fireEvent.blur(input, { relatedTarget: add });
    fireEvent.keyDown(add, { key: 'Escape' });

    expect(screen.queryByTestId('destination-add')).toBeNull();
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

describe('DestinationInput on desktop', () => {
  beforeEach(() => {
    // Radix positions the popover with ResizeObserver, which jsdom does not have.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    vi.spyOn(globalThis, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query === '(min-width: 768px)',
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // Radix listens for a press outside the popover one tick after it opens.
  const waitForOutsideListeners = () => act(() => new Promise((resolve) => setTimeout(resolve)));

  it('floats the list in a popover inside the field', () => {
    const { container } = render(<Harness onAddAddress={() => {}} />);

    fireEvent.focus(screen.getByTestId('destination'));

    const list = screen.getByTestId('destination-list');
    expect(list.getAttribute('data-slot')).toBe('popover-content');
    expect(list.getAttribute('role')).toBeNull();
    expect(container.contains(list)).toBe(true);
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getByTestId('destination-add')).toBeDefined();
  });

  it('picks a suggestion with a click', () => {
    render(<Harness />);

    fireEvent.focus(screen.getByTestId('destination'));
    fireEvent.click(screen.getAllByRole('option')[1]);

    expect(screen.getByTestId('destination-selected').textContent).toContain('Bob');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('closes the list with Escape and does not close the dialog', () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>Send</DialogTitle>
          <DialogDescription>Send ICP</DialogDescription>
          <Harness />
        </DialogContent>
      </Dialog>,
    );
    const input = screen.getByTestId('destination');

    fireEvent.focus(input);
    expect(screen.queryByRole('listbox')).not.toBeNull();

    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('keeps the list open on a press on the input and closes it on a press outside', async () => {
    render(<Harness />);
    const input = screen.getByTestId('destination');

    fireEvent.focus(input);
    await waitForOutsideListeners();

    fireEvent.pointerDown(input);
    expect(screen.queryByRole('listbox')).not.toBeNull();

    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('moves the focus with Tab and Shift+Tab through the add button', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Harness onAddAddress={() => {}} />
        <button type="button">Next</button>
      </>,
    );
    const input = screen.getByTestId('destination');

    await user.click(input);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByTestId('destination-add'));
    expect(screen.queryByRole('listbox')).not.toBeNull();

    await user.tab({ shift: true });
    expect(document.activeElement).toBe(input);
    expect(screen.queryByRole('listbox')).not.toBeNull();

    await user.tab();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next' }));
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});

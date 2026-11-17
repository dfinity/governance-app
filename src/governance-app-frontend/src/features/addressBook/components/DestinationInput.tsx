import { nonNullish } from '@dfinity/utils';
import { autoUpdate, flip, offset, size, useFloating } from '@floating-ui/react-dom';
import { BookPlus, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@components/badge';
import { Input } from '@components/Input';
import { useMediaQuery } from '@hooks/useMediaQuery';
import { isValidIcpAddress, isValidIcrcAddress } from '@utils/address';
import { shortenId } from '@utils/id';
import { cn } from '@utils/shadcn';

export type DestinationSuggestion = {
  name: string;
  address: string;
  kind: 'account' | 'icp' | 'icrc1';
};

type Props = {
  id: string;
  /** The destination as text: a pasted address or the address of the picked suggestion. */
  value: string;
  /** The name of the picked suggestion. Empty when the user typed the value. */
  selectedName: string;
  /** The kind of the picked suggestion, when two suggestions share a name and an address. */
  selectedKind?: DestinationSuggestion['kind'];
  suggestions: DestinationSuggestion[];
  /** The suggestion is set when the user picked one from the list. */
  onChange: (value: string, selectedName: string, suggestion?: DestinationSuggestion) => void;
  /** Adds the "Add a new address" item to the list. */
  onAddAddress?: () => void;
  /** Keeps the picked suggestion. The chip is read-only: it opens no list and has no clear action. */
  locked?: boolean;
  invalid?: boolean;
  placeholder?: string;
  /** Rendered inside the input box, at its right edge. */
  endAdornment?: React.ReactNode;
  inputClassName?: string;
  'data-testid'?: string;
};

const SHORT_ADDRESS_CHARS = 8;

const kindLabelKey = {
  account: 'account',
  icp: 'addressTypeIcp',
  icrc1: 'addressTypeIcrc1',
} as const;

const matchesQuery = (suggestion: DestinationSuggestion, query: string): boolean =>
  suggestion.name.toLowerCase().includes(query) || suggestion.address.toLowerCase().includes(query);

const isCompleteAddress = (text: string): boolean =>
  isValidIcpAddress(text) || isValidIcrcAddress(text);

/**
 * One field for a destination account. The user types a name to filter the
 * suggestions, pastes an address, or picks a suggestion from the list. A
 * picked suggestion shows as a chip with a clear button. A click on the chip
 * opens the full list again, so the user can pick another destination.
 *
 * On desktop the list floats over the content below the field, so the dialog
 * keeps its size. On mobile the list pushes the content down, because the
 * on-screen keyboard leaves no room for a floating list.
 */
export function DestinationInput({
  id,
  value,
  selectedName,
  selectedKind,
  suggestions,
  onChange,
  onAddAddress,
  locked = false,
  invalid,
  placeholder,
  endAdornment,
  inputClassName,
  'data-testid': testId,
}: Props) {
  const { t } = useTranslation();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const selected = suggestions.find(
    (suggestion) =>
      suggestion.name === selectedName &&
      suggestion.address === value &&
      (selectedKind === undefined || suggestion.kind === selectedKind),
  );

  // The chip opens the full list: the picked address is not a filter.
  const query = selected ? '' : value.trim().toLowerCase();
  const matches =
    query === ''
      ? suggestions
      : suggestions.filter((suggestion) => matchesQuery(suggestion, query));
  // The arrow keys move through the matches only. The add command is a
  // separate button that the Tab key reaches.
  const itemCount = matches.length;
  // The read-only chip opens no list.
  const showList =
    open && !(locked && nonNullish(selected)) && (itemCount > 0 || nonNullish(onAddAddress));
  // The suggestions can shrink while the list is open, for example after a refetch.
  const activeMatch = activeIndex < itemCount ? activeIndex : -1;

  const close = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  // A typed name or part of an address makes the first match active, so Enter
  // picks it. A complete address stays as typed: it can be the prefix of a
  // contact with a subaccount.
  const firstMatchIndex = (text: string): number => {
    const nextQuery = text.trim().toLowerCase();
    if (nextQuery === '' || isCompleteAddress(text.trim())) return -1;
    return suggestions.some((suggestion) => matchesQuery(suggestion, nextQuery)) ? 0 : -1;
  };

  const pick = (suggestion: DestinationSuggestion) => {
    onChange(suggestion.address, suggestion.name, suggestion);
    close();
    // The chip replaces the input on the next render and takes the focus.
    requestAnimationFrame(() => chipRef.current?.focus());
  };

  // The list opens on the current pick, so the arrow keys move from it.
  const openFromChip = () => {
    setOpen(true);
    setActiveIndex(selected ? matches.indexOf(selected) : -1);
  };

  const clear = () => {
    onChange('', '');
    // The list can stay open. Enter on the empty input picks nothing.
    setActiveIndex(-1);
    // The input mounts on the next render.
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  // Safari does not focus a clicked button. The focus keeps the open list
  // inside the field, so Escape and a click outside close it. The press keeps
  // the focus where it is, so the blur does not close the list before the
  // click toggles it.
  const handleChipClick = () => {
    chipRef.current?.focus();
    if (open) close();
    else openFromChip();
  };

  const addAddress = () => {
    // A tap leaves the focus on the input. Without the blur, the input keeps the
    // keyboard under the add modal and gets the typed text.
    inputRef.current?.blur();
    onAddAddress?.();
    close();
  };

  // The list stays open while the focus moves between the input and the add button.
  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!containerRef.current?.contains(event.relatedTarget)) close();
  };

  // The keys of an input method editor (IME) composition belong to the IME.
  // Safari sends the Enter that confirms a composition with key code 229.
  const isImeKey = (event: React.KeyboardEvent<HTMLElement>): boolean =>
    event.nativeEvent.isComposing || event.keyCode === 229;

  // The arrow keys open the list and move the active match. True when the key was one.
  const handleArrowKey = (event: React.KeyboardEvent<HTMLElement>): boolean => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return false;
    event.preventDefault();
    if (itemCount === 0) return true;
    setOpen(true);
    const step = event.key === 'ArrowDown' ? 1 : -1;
    setActiveIndex((current) => {
      // No active item: ArrowDown starts at the first item, ArrowUp at the last.
      if (current < 0) return step > 0 ? 0 : itemCount - 1;
      return (current + step + itemCount) % itemCount;
    });
    return true;
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (isImeKey(event) || handleArrowKey(event)) return;
    if (event.key === 'Enter') {
      if (showList && activeMatch >= 0) {
        event.preventDefault();
        pick(matches[activeMatch]);
        return;
      }
      // The form submits the typed text. The list closes, so it does not
      // cover the validation message below the field.
      close();
    }
  };

  const handleChipKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (isImeKey(event)) return;
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      clear();
      return;
    }
    if (handleArrowKey(event)) return;
    // Enter on an active match picks it. Any other Enter, and Space, click the
    // chip, which opens or closes the list.
    if (event.key === 'Enter' && showList && activeMatch >= 0) {
      event.preventDefault();
      pick(matches[activeMatch]);
    }
  };

  // Escape closes the list only. The dialog listens for Escape on the document
  // in the capture phase, so the list takes the key on the window before it.
  const handleEscape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.isComposing || event.keyCode === 229) return;
    if (!containerRef.current?.contains(event.target as Node)) return;
    event.preventDefault();
    event.stopPropagation();
    // The focus opens the list, so the close comes after it.
    (inputRef.current ?? chipRef.current)?.focus();
    close();
  });

  useEffect(() => {
    if (!showList) return;
    const listener = (event: KeyboardEvent) => handleEscape(event);
    window.addEventListener('keydown', listener, { capture: true });
    return () => window.removeEventListener('keydown', listener, { capture: true });
  }, [showList]);

  // Fixed positioning takes the desktop list out of the dialog body's scroll
  // area, so the dialog keeps its size. The list stays next to the input in the
  // DOM, inside the dialog's focus trap and Tab order.
  const [fieldElement, setFieldElement] = useState<HTMLDivElement | null>(null);
  const [listElement, setListElement] = useState<HTMLDivElement | null>(null);
  const { floatingStyles } = useFloating({
    elements: { reference: fieldElement, floating: listElement },
    strategy: 'fixed',
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(4),
      flip({ padding: 8 }),
      size({
        padding: 8,
        // On a short window the list shrinks and scrolls, and the add button stays visible.
        apply({ availableHeight, rects, elements }) {
          Object.assign(elements.floating.style, {
            width: `${rects.reference.width}px`,
            maxHeight: `${Math.max(0, availableHeight)}px`,
          });
        },
      }),
    ],
  });

  const optionId = (index: number) => `${listId}-option-${index}`;

  // The focus stays on the input, so the active option scrolls into view by hand.
  useEffect(() => {
    if (activeMatch < 0) return;
    document
      .getElementById(`${listId}-option-${activeMatch}`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeMatch, listId]);

  const chipClassName =
    'flex h-9 w-full min-w-0 items-center gap-2 rounded-md border border-input py-1 pl-3 text-left text-sm outline-none focus-visible:border-ring dark:bg-input/30';

  const chipContent = selected && (
    <>
      <span className="min-w-0 shrink truncate font-medium">{selected.name}</span>
      <span className="hidden min-w-0 shrink truncate font-mono text-xs text-muted-foreground sm:inline">
        {shortenId(selected.address, SHORT_ADDRESS_CHARS)}
      </span>
      <Badge variant="outline" className="shrink-0 text-[10px]">
        {t(($) => $.addressBook[kindLabelKey[selected.kind]])}
      </Badge>
    </>
  );

  // The chip and the input share the id, so the label names whichever is shown.
  const field = selected ? (
    <div ref={setFieldElement} className="relative">
      {locked ? (
        // An output element is labelable, so the label names the read-only chip.
        <output
          id={id}
          className={cn(chipClassName, 'pr-3')}
          data-testid={testId ? `${testId}-selected` : undefined}
        >
          {chipContent}
        </output>
      ) : (
        // A button is labelable too. A click, Enter or Space opens the list, so
        // the user can pick another destination. The clear button and
        // Backspace clear the pick.
        <button
          ref={chipRef}
          type="button"
          id={id}
          role="combobox"
          aria-expanded={showList}
          aria-controls={showList && itemCount > 0 ? listId : undefined}
          aria-activedescendant={showList && activeMatch >= 0 ? optionId(activeMatch) : undefined}
          title={t(($) => $.addressBook.destination.change)}
          className={cn(
            chipClassName,
            'cursor-pointer pr-10 transition-colors hover:border-ring hover:bg-accent hover:text-accent-foreground dark:hover:bg-input/50',
          )}
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleChipClick}
          onKeyDown={handleChipKeyDown}
          data-testid={testId ? `${testId}-selected` : undefined}
        >
          {chipContent}
          {showList ? (
            <ChevronUp className="ml-auto size-4 shrink-0 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronDown className="ml-auto size-4 shrink-0 text-muted-foreground" aria-hidden />
          )}
        </button>
      )}
      {!locked && (
        <button
          type="button"
          className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-label={t(($) => $.addressBook.destination.clear)}
          onClick={clear}
          data-testid={testId ? `${testId}-clear` : undefined}
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  ) : (
    <div ref={setFieldElement} className="relative">
      <Input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-expanded={showList}
        aria-controls={showList && itemCount > 0 ? listId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={showList && activeMatch >= 0 ? optionId(activeMatch) : undefined}
        aria-invalid={invalid}
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value, '');
          setOpen(true);
          setActiveIndex(firstMatchIndex(event.target.value));
        }}
        onFocus={() => setOpen(true)}
        // A click on the focused input gives no focus event, for example after Escape.
        onClick={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className={cn('font-mono placeholder:font-sans', endAdornment && 'pr-10', inputClassName)}
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
        required
        data-testid={testId}
      />
      {endAdornment}
    </div>
  );

  const listItems = (
    <>
      {matches.length > 0 && (
        <ul id={listId} role="listbox" className="max-h-56 min-h-0 overflow-y-auto">
          {matches.map((suggestion, index) => (
            <li
              key={`${suggestion.kind}:${suggestion.name}:${suggestion.address}`}
              id={optionId(index)}
              role="option"
              aria-selected={index === activeMatch}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm',
                index === activeMatch && 'bg-accent text-accent-foreground',
              )}
              // The input keeps the focus, so the blur handler does not close the list first.
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => pick(suggestion)}
              data-testid={testId ? `${testId}-option` : undefined}
            >
              <span className="min-w-0 shrink truncate font-medium">{suggestion.name}</span>
              <span className="min-w-0 shrink truncate font-mono text-xs text-muted-foreground">
                {shortenId(suggestion.address, SHORT_ADDRESS_CHARS)}
              </span>
              <Badge variant="outline" className="ml-auto shrink-0 text-[10px]">
                {t(($) => $.addressBook[kindLabelKey[suggestion.kind]])}
              </Badge>
            </li>
          ))}
        </ul>
      )}
      {onAddAddress && (
        // A command, not an option: it opens the add modal and picks nothing.
        <button
          type="button"
          className={cn(
            'flex w-full shrink-0 cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground',
            matches.length > 0 && 'mt-1 border-t pt-2',
          )}
          // Safari does not focus a tapped button. The input keeps the focus, so the blur
          // handler does not close the list before the click.
          onMouseDown={(event) => event.preventDefault()}
          onClick={addAddress}
          data-testid={testId ? `${testId}-add` : undefined}
        >
          <BookPlus className="size-4 text-muted-foreground" />
          <span>{t(($) => $.addressBook.destination.addNew)}</span>
        </button>
      )}
    </>
  );

  const listClassName = 'rounded-md border bg-popover p-1 text-popover-foreground shadow-md';

  return (
    <div ref={containerRef} className="flex flex-col gap-1" onBlur={handleBlur}>
      {field}
      {showList &&
        (isDesktop ? (
          <div
            ref={setListElement}
            style={floatingStyles}
            className={cn(listClassName, 'z-50 flex flex-col')}
            data-testid={testId ? `${testId}-list` : undefined}
          >
            {listItems}
          </div>
        ) : (
          <div className={listClassName} data-testid={testId ? `${testId}-list` : undefined}>
            {listItems}
          </div>
        ))}
    </div>
  );
}

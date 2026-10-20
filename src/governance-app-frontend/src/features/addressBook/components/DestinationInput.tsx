import { nonNullish } from '@dfinity/utils';
import { BookPlus, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@components/badge';
import { Input } from '@components/Input';
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
  suggestions: DestinationSuggestion[];
  onChange: (value: string, selectedName: string) => void;
  /** Adds the "Add a new address" item to the list. */
  onAddAddress?: () => void;
  /** Keeps the picked suggestion. The chip is read-only and has no clear action. */
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
 * picked suggestion shows as a chip with a clear button.
 */
export function DestinationInput({
  id,
  value,
  selectedName,
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
  const chipRef = useRef<HTMLOutputElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const selected = suggestions.find(
    (suggestion) => suggestion.name === selectedName && suggestion.address === value,
  );

  const query = value.trim().toLowerCase();
  const matches =
    query === ''
      ? suggestions
      : suggestions.filter((suggestion) => matchesQuery(suggestion, query));
  // The arrow keys move through the matches only. The add command is a
  // separate button that the Tab key reaches.
  const itemCount = matches.length;
  const showList = open && (itemCount > 0 || nonNullish(onAddAddress));
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
    onChange(suggestion.address, suggestion.name);
    close();
    // The chip replaces the input on the next render and takes the focus.
    requestAnimationFrame(() => chipRef.current?.focus());
  };

  const clear = () => {
    onChange('', '');
    // The input mounts on the next render.
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const addAddress = () => {
    onAddAddress?.();
    close();
  };

  // The list stays open while the focus moves between the input and the add button.
  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!containerRef.current?.contains(event.relatedTarget)) close();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // The keys of an input method editor (IME) composition belong to the IME.
    // Safari sends the Enter that confirms a composition with key code 229.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (itemCount === 0) return;
      setOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((current) => {
        // No active item: ArrowDown starts at the first item, ArrowUp at the last.
        if (current < 0) return step > 0 ? 0 : itemCount - 1;
        return (current + step + itemCount) % itemCount;
      });
      return;
    }
    if (event.key === 'Enter' && showList && activeMatch >= 0) {
      event.preventDefault();
      pick(matches[activeMatch]);
      return;
    }
    if (event.key === 'Escape' && showList) {
      // Close the list only. The dialog stays open.
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  };

  const optionId = (index: number) => `${listId}-option-${index}`;

  // The focus stays on the input, so the active option scrolls into view by hand.
  useEffect(() => {
    if (activeMatch < 0) return;
    document
      .getElementById(`${listId}-option-${activeMatch}`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeMatch, listId]);

  if (selected) {
    // An output element is labelable and, with a tab index, focusable, so the
    // label names the chip and the focus stays on the field. A click on the
    // label does nothing. Only the clear button and Backspace clear the pick.
    return (
      <div className="relative">
        <output
          ref={chipRef}
          id={id}
          tabIndex={locked ? undefined : 0}
          className={cn(
            'flex h-9 w-full min-w-0 items-center gap-2 rounded-md border border-input py-1 pl-3 text-sm outline-none focus-visible:border-ring dark:bg-input/30',
            locked ? 'pr-3' : 'pr-10',
          )}
          onKeyDown={(event) => {
            if (locked) return;
            if (event.key === 'Backspace' || event.key === 'Delete') {
              event.preventDefault();
              clear();
            }
          }}
          data-testid={testId ? `${testId}-selected` : undefined}
        >
          <span className="min-w-0 shrink truncate font-medium">{selected.name}</span>
          <span className="hidden min-w-0 shrink truncate font-mono text-xs text-muted-foreground sm:inline">
            {shortenId(selected.address, SHORT_ADDRESS_CHARS)}
          </span>
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {t(($) => $.addressBook[kindLabelKey[selected.kind]])}
          </Badge>
        </output>
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
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-1" onBlur={handleBlur}>
      <div className="relative">
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
      {showList && (
        <div
          className="rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          data-testid={testId ? `${testId}-list` : undefined}
        >
          {matches.length > 0 && (
            <ul id={listId} role="listbox" className="max-h-56 overflow-y-auto">
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
                'flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground',
                matches.length > 0 && 'mt-1 border-t pt-2',
              )}
              onClick={addAddress}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  event.stopPropagation();
                  // The focus opens the list, so the close comes after it.
                  inputRef.current?.focus();
                  close();
                }
              }}
              data-testid={testId ? `${testId}-add` : undefined}
            >
              <BookPlus className="size-4 text-muted-foreground" />
              <span>{t(($) => $.addressBook.destination.addNew)}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

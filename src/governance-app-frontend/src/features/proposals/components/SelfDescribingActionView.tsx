import type { NnsGovernanceDid, SelfDescribingProposalAction } from '@icp-sdk/canisters/nns';

import { Badge } from '@components/badge';

type SelfDescribingValue = NnsGovernanceDid.SelfDescribingValue;

type SelfDescribingActionViewProps = {
  action: SelfDescribingProposalAction;
};

export const SelfDescribingActionView: React.FC<SelfDescribingActionViewProps> = ({ action }) => {
  return (
    <div className="flex flex-col gap-4">
      {action.typeName && (
        <div className="flex flex-col gap-1.5">
          <Badge variant="info-subtle" className="w-fit text-xs font-medium">
            {action.typeName}
          </Badge>
          {action.typeDescription && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {action.typeDescription}
            </p>
          )}
        </div>
      )}

      {action.value && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <ValueRenderer value={action.value} />
        </div>
      )}
    </div>
  );
};

function ValueRenderer({ value }: { value: SelfDescribingValue }) {
  if ('Map' in value) return <MapRenderer entries={value.Map} />;
  if ('Array' in value) return <ArrayRenderer items={value.Array} />;
  if ('Text' in value) return <span className="break-all">{value.Text}</span>;
  if ('Nat' in value) return <span className="font-mono">{value.Nat.toLocaleString()}</span>;
  if ('Int' in value) return <span className="font-mono">{value.Int.toLocaleString()}</span>;
  if ('Bool' in value) return <span className="font-mono">{String(value.Bool)}</span>;
  if ('Blob' in value) return <BlobRenderer data={value.Blob} />;
  if ('Null' in value) return <span className="text-muted-foreground italic">null</span>;

  return null;
}

function MapRenderer({ entries }: { entries: Array<[string, SelfDescribingValue]> }) {
  const sorted = entries.toSorted(([a], [b]) => a.localeCompare(b));

  return (
    <dl className="flex flex-col gap-3">
      {sorted.map(([key, val]) => {
        const isNested = 'Map' in val || 'Array' in val;

        return (
          <div key={key} className="flex flex-col gap-1">
            <dt className="text-xs font-medium text-muted-foreground">{humanizeKey(key)}</dt>
            <dd className={isNested ? 'pl-3' : 'text-sm'}>
              <ValueRenderer value={val} />
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function ArrayRenderer({ items }: { items: SelfDescribingValue[] }) {
  if (items.length === 0) return <span className="text-muted-foreground italic">empty</span>;

  const primitives = items.filter((item) => !('Map' in item) && !('Array' in item));
  const arrays = items.filter((item) => 'Array' in item);
  const maps = items.filter((item) => 'Map' in item);

  return (
    <div className="flex flex-col gap-3">
      {primitives.length > 0 && (
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
          {primitives.map((item, i) => (
            <li key={i}>
              <ValueRenderer value={item} />
            </li>
          ))}
        </ul>
      )}

      {arrays.length > 0 && (
        <ol className="flex flex-col gap-2">
          {arrays.map((item, i) => (
            <li key={i} className="border-l-2 border-border pl-3">
              <ValueRenderer value={item} />
            </li>
          ))}
        </ol>
      )}

      {maps.length > 0 && (
        <div className="flex flex-col gap-3">
          {maps.map((item, i) => (
            <div key={i} className="border-l-2 border-border pl-3">
              <ValueRenderer value={item} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BlobRenderer({ data }: { data: Uint8Array }) {
  const MAX_DISPLAY_BYTES = 32;
  const hex = Array.from(data.slice(0, MAX_DISPLAY_BYTES))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const truncated = data.length > MAX_DISPLAY_BYTES;

  return (
    <span className="font-mono text-xs break-all">
      {hex}
      {truncated && <span className="text-muted-foreground">… ({data.length} bytes)</span>}
    </span>
  );
}

function humanizeKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

import type { NnsGovernanceDid, SelfDescribingProposalAction } from '@icp-sdk/canisters/nns';
import { useTranslation } from 'react-i18next';

type SelfDescribingValue = NnsGovernanceDid.SelfDescribingValue;

type Props = {
  action: SelfDescribingProposalAction;
};

export const SelfDescribingActionView: React.FC<Props> = ({ action }) => {
  if (!action.value) return null;

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <ValueRenderer value={action.value} />
    </div>
  );
};

function ValueRenderer({ value }: { value: SelfDescribingValue }) {
  const { t } = useTranslation();

  if ('Map' in value) return <MapRenderer entries={value.Map} />;
  if ('Array' in value) return <ArrayRenderer items={value.Array} />;
  if ('Text' in value) {
    if (value.Text === '') return <span className="text-muted-foreground">—</span>;
    return <span className="break-all">{value.Text}</span>;
  }
  if ('Nat' in value) return <span className="font-mono">{value.Nat.toLocaleString()}</span>;
  if ('Int' in value) return <span className="font-mono">{value.Int.toLocaleString()}</span>;
  if ('Bool' in value) return <span className="font-mono">{String(value.Bool)}</span>;
  if ('Blob' in value) return <BlobRenderer data={value.Blob} />;

  if ('Null' in value) {
    return (
      <span className="text-muted-foreground italic">
        {t(($) => $.proposal.selfDescribingAction.null)}
      </span>
    );
  }

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
            <dt className="text-xs font-medium text-muted-foreground capitalize">
              {key.replace(/_/g, ' ')}
            </dt>
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
  const { t } = useTranslation();

  if (items.length === 0) {
    return (
      <span className="text-muted-foreground italic">
        {t(($) => $.proposal.selfDescribingAction.empty)}
      </span>
    );
  }

  return (
    <ul className="flex flex-col gap-2 text-sm">
      {items.map((item, i) => {
        const isNested = 'Map' in item || 'Array' in item;

        return (
          <li key={i} className={isNested ? 'pl-3' : 'ml-5 list-inside list-disc'}>
            <ValueRenderer value={item} />
          </li>
        );
      })}
    </ul>
  );
}

function BlobRenderer({ data }: { data: Uint8Array }) {
  const { t } = useTranslation();

  if (data.length === 0)
    return (
      <span className="font-mono text-xs text-muted-foreground">
        {t(($) => $.proposal.selfDescribingAction.blobEmpty)}
      </span>
    );

  const maxDisplayBytes = 32;
  const hex = Array.from(data.slice(0, maxDisplayBytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const truncated = data.length > maxDisplayBytes;

  return (
    <span className="font-mono text-xs break-all">
      {hex}
      {truncated && (
        <span className="text-muted-foreground">
          {t(($) => $.proposal.selfDescribingAction.blobTruncated, { size: data.length })}
        </span>
      )}
    </span>
  );
}

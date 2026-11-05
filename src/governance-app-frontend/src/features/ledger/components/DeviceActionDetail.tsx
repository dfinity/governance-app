/** Lines of values that the approval dialog shows under its description. */
export const DeviceActionDetail = ({ lines }: { lines: string[] }) => (
  <span className="flex flex-col gap-1">
    {lines.map((line) => (
      <span key={line}>{line}</span>
    ))}
  </span>
);

/** Labeled values in the approval dialog, in the order the device screen shows them. */
export const DeviceActionLabeledDetail = ({
  entries,
}: {
  entries: { label: string; value: string }[];
}) => (
  <dl className="flex flex-col gap-2 text-left">
    {entries.map(({ label, value }) => (
      <div key={label} className="flex flex-col gap-0.5">
        <dt className="font-sans text-muted-foreground">{label}</dt>
        <dd>{value}</dd>
      </div>
    ))}
  </dl>
);

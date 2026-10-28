/** Lines of values that the approval dialog shows under its description. */
export const DeviceActionDetail = ({ lines }: { lines: string[] }) => (
  <span className="flex flex-col gap-1">
    {lines.map((line) => (
      <span key={line}>{line}</span>
    ))}
  </span>
);

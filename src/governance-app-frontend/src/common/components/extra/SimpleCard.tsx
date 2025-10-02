type Props = {
  children: React.ReactNode;
};

export const SimpleCard = ({ children }: Props) => {
  return (
    <div className="flex h-full flex-col justify-between rounded-lg bg-primary p-4 shadow-xs ring-1 ring-secondary ring-inset focus-visible:outline-2 focus-visible:outline-offset-2">
      {children}
    </div>
  );
};

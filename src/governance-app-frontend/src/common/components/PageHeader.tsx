import { ReactNode } from 'react';

type Props = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export const PageHeader = ({ title, description, actions }: Props) => {
  return (
    <header className="flex flex-col gap-6 sm:flex-row sm:justify-between">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-1 gap-2 sm:flex-initial">{actions}</div>}
    </header>
  );
};

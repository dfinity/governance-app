import { useHideBalances } from '@hooks/useHideBalances';

type SensitiveValueProps = {
  children: React.ReactNode;
  size?: 'sm' | 'md';
};

// Co-located with the component so the placeholder text stays in sync with what
// SensitiveValue renders. Only affects HMR for this file, not its consumers.
// eslint-disable-next-line react-refresh/only-export-components
export const SENSITIVE_PLACEHOLDER = {
  sm: '•••',
  md: '•••••',
};

export const SensitiveValue = ({ children, size = 'md' }: SensitiveValueProps) => {
  const { hidden } = useHideBalances();

  if (hidden) return <>{SENSITIVE_PLACEHOLDER[size]}</>;

  return <>{children}</>;
};

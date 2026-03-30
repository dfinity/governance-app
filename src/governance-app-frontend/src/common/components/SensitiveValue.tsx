import { useHideBalances } from '@hooks/useHideBalances';

type SensitiveValueProps = {
  children: React.ReactNode;
  size?: 'sm' | 'md';
};

export const SENSITIVE_PLACEHOLDER = {
  sm: '•••',
  md: '•••••',
};

export const SensitiveValue = ({ children, size = 'md' }: SensitiveValueProps) => {
  const { hidden } = useHideBalances();

  if (hidden) return <>{SENSITIVE_PLACEHOLDER[size]}</>;

  return <>{children}</>;
};

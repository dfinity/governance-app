import { useHideBalances } from '@hooks/useHideBalances';

type SensitiveValueProps = {
  children: React.ReactNode;
  size?: 'sm' | 'md';
};

const DOTS = {
  sm: '•••',
  md: '•••••',
};

export const SensitiveValue = ({ children, size = 'md' }: SensitiveValueProps) => {
  const { hidden } = useHideBalances();

  if (hidden) return <>{DOTS[size]}</>;

  return <>{children}</>;
};

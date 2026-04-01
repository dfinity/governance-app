import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

  if (hidden) {
    return (
      <span aria-label={t(($) => $.common.aria.hiddenValue)}>{SENSITIVE_PLACEHOLDER[size]}</span>
    );
  }

  return <>{children}</>;
};

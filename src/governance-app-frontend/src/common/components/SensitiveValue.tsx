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

  // Each state has its own keyed <span>, so a toggle replaces the whole element.
  // Page translators move the text nodes into their own <font> elements, so React
  // cannot remove those text nodes, and a toggle would leave the old value on screen.
  if (hidden) {
    return (
      <span key="hidden" aria-label={t(($) => $.common.aria.hiddenValue)}>
        {SENSITIVE_PLACEHOLDER[size]}
      </span>
    );
  }

  return <span key="visible">{children}</span>;
};

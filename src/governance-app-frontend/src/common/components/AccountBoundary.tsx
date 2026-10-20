import { Fragment, ReactNode } from 'react';

import { useInternetIdentity } from '@hooks/useInternetIdentity';

/**
 * Mounts its children again when the account changes, so no open dialog or form keeps data of the
 * account before. Another tab can switch the account at any time.
 */
export const AccountBoundary = ({ children }: { children: ReactNode }) => {
  const { identity } = useInternetIdentity();

  return <Fragment key={identity?.getPrincipal().toText()}>{children}</Fragment>;
};

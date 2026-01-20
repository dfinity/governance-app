import { isNullish } from '@dfinity/utils';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useTranslation } from 'react-i18next';

import { CopyButton } from '@components/CopyButton';

export const PrincipalCard = () => {
  const { identity } = useInternetIdentity();
  const { t } = useTranslation();

  if (isNullish(identity)) return null;

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="font-medium text-foreground">{t(($) => $.userAccount.principalId)}</p>
        <p className="font-mono text-sm break-words text-muted-foreground">
          {identity.getPrincipal().toText()}
        </p>
      </div>
      <CopyButton
        value={identity.getPrincipal().toText()}
        label={t(($) => $.userAccount.principalIdentifier)}
        className="shrink-0"
      />
    </div>
  );
};

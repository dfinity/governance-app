import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { isNullish } from '@dfinity/utils';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@components/badge';
import { CopyButton } from '@components/CopyButton';

export const PrincipalCard = () => {
  const { identity } = useInternetIdentity();
  const { t } = useTranslation();

  if (isNullish(identity)) return null;

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-1.5 min-w-0">
        <p className="font-medium text-foreground">{t(($) => $.accountSettings.principalId)}</p>
        <p className="font-mono text-sm text-muted-foreground break-all">
          {identity.getPrincipal().toText()}
        </p>
      </div>
      <CopyButton
        value={identity.getPrincipal().toText()}
        label={t(($) => $.accountSettings.principalIdentifier)}
        className="shrink-0"
      />
    </div>
  );
};

export const AccountIdCard = () => {
  const { identity } = useInternetIdentity();
  const { t } = useTranslation();

  const accountId = useMemo(() => {
    if (!identity) return '';
    return AccountIdentifier.fromPrincipal({ principal: identity.getPrincipal() }).toHex();
  }, [identity]);

  if (isNullish(identity)) return null;

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-1.5 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground">{t(($) => $.accountSettings.accountId)}</p>
          <Badge variant="info" className="font-normal text-[10px] h-4.5 px-1.5 py-0">
            {t(($) => $.accountSettings.accountIdExchangeBadge)}
          </Badge>
        </div>
        <p className="font-mono text-sm text-muted-foreground break-all">
          {accountId}
        </p>
      </div>
      <CopyButton
        value={accountId}
        label={t(($) => $.accountSettings.accountIdentifier)}
        className="shrink-0"
      />
    </div>
  );
};

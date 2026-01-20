import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { isNullish } from '@dfinity/utils';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@components/badge';
import { CopyButton } from '@components/CopyButton';

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
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground">{t(($) => $.userAccount.accountId)}</p>
          <Badge variant="info" className="h-[18px] px-1.5 py-0 text-[10px] font-normal">
            {t(($) => $.userAccount.accountIdExchangeBadge)}
          </Badge>
        </div>
        <p className="font-mono text-sm break-words text-muted-foreground">{accountId}</p>
      </div>
      <CopyButton
        value={accountId}
        label={t(($) => $.userAccount.accountId)}
        className="shrink-0"
      />
    </div>
  );
};

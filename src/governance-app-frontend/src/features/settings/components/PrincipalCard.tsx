import { isNullish } from '@dfinity/utils';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useTranslation } from 'react-i18next';

import { Card, CardContent } from '@components/Card';
import { CopyButton } from '@components/CopyButton';

export const PrincipalCard = () => {
  const { identity } = useInternetIdentity();
  const { t } = useTranslation();

  if (isNullish(identity)) return null;

  return (
    <Card className="rounded-md px-4 py-6">
      <CardContent className="p-0">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <p className="leading-none font-medium">{t(($) => $.settings.principalId)}</p>
            <p className="font-mono text-sm text-muted-foreground">
              {identity.getPrincipal().toText()}
            </p>
          </div>
          <CopyButton
            value={identity.getPrincipal().toText()}
            label={t(($) => $.settings.principalIdentifier)}
          />
        </div>
      </CardContent>
    </Card>
  );
};

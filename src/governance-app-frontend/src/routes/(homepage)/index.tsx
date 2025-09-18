import { createFileRoute } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/(homepage)/')({
  component: Homepage,
});

function Homepage() {
  const { identity } = useInternetIdentity();
  const { t } = useTranslation();

  return (
    <div className="text-xs" data-testid="login-test" data-snapshot-mask>
      {identity
        ? t(($) => $.home.yourPrincipal, {
            principal: identity.getPrincipal().toString(),
          })
        : t(($) => $.common.login)}
    </div>
  );
}

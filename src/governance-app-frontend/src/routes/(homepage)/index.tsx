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
    <>
      <h1 className="text-4xl font-bold pb-4">Lorem ipsum dolor sit amet 🙀</h1>
      <div className="text-xl" data-testid="login-test" data-snapshot-mask>
        {identity
          ? t(($) => $.home.yourPrincipal, {
              principal: identity.getPrincipal().toString(),
            })
          : t(($) => $.common.login)}
      </div>
    </>
  );
}

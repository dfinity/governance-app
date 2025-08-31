import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import useTitle from '@hooks/useTitle';

export const Route = createFileRoute('/sns/')({
  component: SnsIndex,
});

function SnsIndex() {
  const { t } = useTranslation();
  useTitle(t(($) => $.common.sns));

  return <div className="text-xl">{t(($) => $.sns.description)}</div>;
}

import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Link } from '@untitledui/components';

import useTitle from '@hooks/useTitle';

export const Route = createFileRoute('/nns/')({
  component: NnsIndex,
});

function NnsIndex() {
  const { t } = useTranslation();
  useTitle(t(($) => $.common.nns));

  return (
    <div className="text-xl text-primary">
      {t(($) => $.nns.description)}
      <p className="mt-2 text-blue-500 italic underline">
        <Link to="/nns/proposals">{t(($) => $.common.seeProposals)}</Link>
      </p>
      <p className="mt-2 text-blue-500 italic underline">
        <Link to="/nns/neurons">{t(($) => $.common.seeNeurons)}</Link>
      </p>
    </div>
  );
}

import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import useTitle from '@hooks/useTitle';

export const Route = createFileRoute('/nns/')({
  component: NnsIndex,
});

function NnsIndex() {
  const { t } = useTranslation();
  useTitle(t(($) => $.common.nns));

  return (
    <div className="text-xl">
      {t(($) => $.nns.description)}
      <p className="text-blue-500 underline italic mt-2">
        <Link to="/nns/proposals">{t(($) => $.common.seeProposals)}</Link>
      </p>
      <p className="text-blue-500 underline italic mt-2">
        <Link to="/nns/neurons">{t(($) => $.common.seeNeurons)}</Link>
      </p>
    </div>
  );
}

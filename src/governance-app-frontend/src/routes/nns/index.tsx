import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import styles from '../../common/components/layouts/main/mainLayout.module.css';

export const Route = createFileRoute('/nns/')({
  component: NnsIndex,
});

function NnsIndex() {
  const { t } = useTranslation();
  const DEMO_PROPOSAL_ID = '1';

  return (
    <>
      <div>
        Welcome to the NNS route! This is a placeholder for the NNS governance app frontend.
      </div>
      <Link
        to="/nns/proposal/$proposal"
        params={{ proposal: DEMO_PROPOSAL_ID }}
        className={styles.link}
      >
        {t(($) => $.proposal.toProposal, { proposalId: DEMO_PROPOSAL_ID })}
      </Link>
    </>
  );
}

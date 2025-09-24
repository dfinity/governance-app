import { NeuronState } from '@dfinity/nns';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { CertifiedBadge } from '@components/badges/certified/CertifiedBadge';
import { WarningMessage } from '@components/extra/WarningMessage';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { E8S } from '@constants/extra';
import { useGovernanceNeurons } from '@hooks/canisters/governance/useGovernanceNeurons';
import useTitle from '@hooks/useTitle';
import { requireIdentity } from '@utils/routes';
import { Input } from '@untitledui/components/base/input/input';
import { useIcpLedgerAccountBalance } from '../../../common/hooks/canisters/icpLedger/useIcpLedgerAccountBalance';
import { Button } from '@untitledui/components';

export const Route = createFileRoute('/nns/neurons/')({
  component: NeuronsPage,
  beforeLoad: requireIdentity,
});

function NeuronsPage() {
  const { isLoading, error, data } = useGovernanceNeurons();
  const { t } = useTranslation();
  useTitle(t(($) => $.common.neuronsList));

  const { data: balanceValue } = useIcpLedgerAccountBalance();

  // log balanceValue to console
  console.log('balanceValue', balanceValue);

  return (
    <div className="flex flex-col gap-2 text-xl">
      <div className="mb-2 flex gap-2">{t(($) => $.neuron.stake)}</div>

      <div
        className="mb-4 flex items-center gap-2 rounded-lg p-4 shadow-md"
        style={{ backgroundColor: 'var(--background-color-secondary)' }}
      >
        <Input
          isRequired
          type="number"
          label="How much ICP to stake"
          hint={`Minimum 1 ICP, maximum ${
            balanceValue?.response !== undefined
              ? Number(balanceValue.response) / E8S + ' ' + t(($) => $.common.icp)
              : '-'
          } ICP`}
          placeholder="10.00"
          tooltip="This amount will be staked from your balance"
        />
        <Button onClick={() => alert('Not implemented yet')} className="w-fit">
          {t(($) => $.neuron.stake)}
        </Button>
      </div>

      <div className="mb-2 flex gap-2">{t(($) => $.common.neuronsList)}</div>

      {isLoading && <SkeletonLoader count={3} />}
      {!isLoading && !data?.response.length && (
        <WarningMessage message={t(($) => $.common.noNeurons)} />
      )}
      {error && t(($) => $.common.errorLoadingNeurons, { error: error.message })}

      <div className="grid grid-cols-1 gap-4 text-lg sm:grid-cols-2 lg:grid-cols-3">
        {data?.response.map((neuron) => (
          <div
            style={{ backgroundColor: 'var(--background-color-secondary)' }}
            className="flex h-full flex-col justify-between rounded-lg border p-4"
            key={neuron.neuronId}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="overflow-hidden text-ellipsis">#{neuron.neuronId}</p>
              {data?.certified ? <CertifiedBadge /> : <SkeletonLoader width={90} />}
            </div>
            <div className="mt-2 gap-1 text-sm">
              <table className="text-sm">
                <tbody>
                  <tr>
                    <td className="pr-2 font-bold">{t(($) => $.neuron.creationDate)}:</td>
                    <td>
                      {neuron.fullNeuron?.createdTimestampSeconds
                        ? new Date(
                            Number(neuron.fullNeuron.createdTimestampSeconds) * 1000,
                          ).toLocaleDateString()
                        : '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className="pr-2 font-bold">{t(($) => $.neuron.status)}:</td>
                    <td>{NeuronState[neuron.state]}</td>
                  </tr>
                  <tr>
                    <td className="pr-2 font-bold">{t(($) => $.neuron.stake)}:</td>
                    <td>
                      {Number(neuron.fullNeuron?.cachedNeuronStake) / E8S} {t(($) => $.common.icp)}
                    </td>
                  </tr>
                  <tr>
                    <td className="pr-2 font-bold">{t(($) => $.neuron.votingPower)}:</td>
                    <td>{neuron.votingPower}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@untitledui/components';
import { Input } from '@untitledui/components/base/input/input';
import {
  Dialog,
  DialogTrigger,
  Modal,
  ModalOverlay,
} from '@untitledui/components/application/modals/modal';

interface Props {
  neuronId: bigint;
}

export const SetDissolveDelayModal = ({ neuronId }: Props) => {
  const { t } = useTranslation();
  const [delayDays, setDelayDays] = useState('');

  const handleSubmit = (close: () => void) => (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO: Wire up dissolve delay mutation when available.
    close();
  };

  return (
    <DialogTrigger>
      <Button slot="trigger" color="secondary" size="sm">
        {t(($) => $.neuron.setDissolveDelay)}
      </Button>

      <ModalOverlay isKeyboardDismissDisabled>
        <Modal className={'max-w-md rounded-2xl bg-primary p-6 shadow-lg'}>
          <Dialog aria-label={t(($) => $.neuron.setDissolveDelayModal.title)}>
            {({ close }) => (
              <form className="flex flex-col gap-4" onSubmit={handleSubmit(close)}>
                <div>
                  <h3 className="text-lg font-semibold text-primary">
                    {t(($) => $.neuron.setDissolveDelayModal.title)}
                  </h3>
                  <p className="mt-1 text-sm text-secondary">
                    {t(($) => $.neuron.setDissolveDelayModal.description, {
                      id: neuronId.toString(),
                    })}
                  </p>
                </div>

                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={delayDays}
                  onChange={setDelayDays}
                  label={t(($) => $.neuron.setDissolveDelayModal.delayLabel)}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" color="tertiary" onClick={close}>
                    {t(($) => $.neuron.setDissolveDelayModal.actions.cancel)}
                  </Button>
                  <Button type="submit">
                    {t(($) => $.neuron.setDissolveDelayModal.actions.confirm)}
                  </Button>
                </div>
              </form>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
};

import { useTranslation } from 'react-i18next';

import type { NamedAddress } from '@declarations/governance-app-backend/governance-app-backend.did';

import { NativeSelect, NativeSelectOption } from '@components/NativeSelect';
import { addressBookGetAddressString } from '@utils/addressBook';

type Props = {
  addresses: NamedAddress[];
  selectedName: string;
  onSelect: (name: string, address: string) => void;
  disabled?: boolean;
};

export const AddressBookSelect: React.FC<Props> = ({
  addresses,
  selectedName,
  onSelect,
  disabled,
}) => {
  const { t } = useTranslation();

  const handleChange = (name: string) => {
    const entry = addresses.find((e) => e.name === name);
    onSelect(name, entry ? addressBookGetAddressString(entry.address) : '');
  };

  return (
    <NativeSelect
      value={selectedName}
      onChange={(e) => handleChange(e.target.value)}
      disabled={disabled}
      className="w-full"
      data-testid="address-book-select"
      id="address-book-select"
    >
      <NativeSelectOption value="">
        {t(($) => $.addressBook.sendFlow.selectPlaceholder)}
      </NativeSelectOption>
      {addresses.map((entry) => (
        <NativeSelectOption key={entry.name} value={entry.name}>
          {entry.name}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
};

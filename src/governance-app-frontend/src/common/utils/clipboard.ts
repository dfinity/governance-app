import type { TFunction } from 'i18next';

import { errorNotification, successNotification } from '@utils/notification';

/**
 * Copies the value and shows a toast that names the label.
 * Returns `false` if the copy fails.
 */
export const copyToClipboard = ({
  t,
  value,
  label,
}: {
  t: TFunction;
  value: string;
  label: string;
}): boolean => {
  try {
    navigator.clipboard.writeText(value);
    successNotification({ description: t(($) => $.common.clipboard.copied, { label }) });
    return true;
  } catch (e) {
    console.error('Failed to copy to clipboard', e);
    errorNotification({ description: t(($) => $.common.clipboard.error) });
    return false;
  }
};

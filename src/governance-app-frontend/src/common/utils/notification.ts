import { toast } from 'sonner';

import i18n from '@/i18n/config';

type NotificationOptions = {
  title?: string;
  description: string;
};

const ephemeralNotification = {
  duration: 1500,
  closeButton: false,
};

const persistentNotification = {
  duration: Infinity,
  closeButton: true,
};

export const successNotification = ({ title, description }: NotificationOptions) =>
  toast.success(title || i18n.t(($) => $.common.success), {
    description: description,
    ...ephemeralNotification,
  });

export const warningNotification = ({ title, description }: NotificationOptions) =>
  toast.warning(title || i18n.t(($) => $.common.warning), {
    description: description,
    ...ephemeralNotification,
  });

export const infoNotification = ({ title, description }: NotificationOptions) =>
  toast.info(title || i18n.t(($) => $.common.info), {
    description: description,
    ...ephemeralNotification,
  });

export const errorNotification = ({ title, description }: NotificationOptions) =>
  toast.error(title || i18n.t(($) => $.common.error), {
    description: description,
    ...persistentNotification,
  });

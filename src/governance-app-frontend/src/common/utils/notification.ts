import { toast, ToasterProps } from 'sonner';

import i18n from '@/i18n/config';

type NotificationOptions = {
  title?: string;
  description: React.ReactNode;
};

const ephemeralNotification: ToasterProps = {
  duration: 2500,
  closeButton: false,
};

const persistentNotification: ToasterProps = {
  duration: Infinity,
  closeButton: true,
};

export const defaultNotification = ({ title, description }: NotificationOptions) =>
  toast(title, {
    description,
    ...ephemeralNotification,
  });

export const successNotification = ({ title, description }: NotificationOptions) =>
  toast.success(title, {
    description,
    ...ephemeralNotification,
  });

export const warningNotification = ({ title, description }: NotificationOptions) =>
  toast.warning(title || i18n.t(($) => $.common.warning), {
    description,
    ...ephemeralNotification,
  });

export const infoNotification = ({ title, description }: NotificationOptions) =>
  toast.info(title || i18n.t(($) => $.common.info), {
    description,
    ...ephemeralNotification,
  });

export const errorNotification = ({ title, description }: NotificationOptions) =>
  toast.error(title || i18n.t(($) => $.common.error), {
    description,
    ...persistentNotification,
  });

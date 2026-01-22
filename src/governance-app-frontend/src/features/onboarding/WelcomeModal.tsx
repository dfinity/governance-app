import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { WELCOME_MODAL_STORAGE_KEY } from '@constants/extra';
import { successNotification } from '@utils/notification';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
} from '@common/components/ResponsiveDialog';

export function WelcomeModal() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const hasSeenModal = localStorage.getItem(WELCOME_MODAL_STORAGE_KEY);
    if (!hasSeenModal) setIsOpen(true);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem(WELCOME_MODAL_STORAGE_KEY, 'true');
    successNotification({
      description: t(($) => $.welcomeModal.toast),
    });
  };

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={setIsOpen}>
      <ResponsiveDialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        showCloseButton={false}
        className="flex flex-col lg:max-w-xl overflow-hidden p-0 gap-0"
        data-testid="welcome-modal"
      >
        <img src="/welcome-image.svg" alt="Welcome" className="w-full rounded-t-lg mt-4 md:mt-0" />
        <div className="flex flex-col items-center gap-2 px-6 lg:px-8 pt-8 pb-8 lg:pb-0">
          <ResponsiveDialogTitle className="text-2xl text-center">
            {t(($) => $.welcomeModal.title)}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="text-center text-[15px] text-pretty text-muted-foreground">
            {t(($) => $.welcomeModal.content)}
          </ResponsiveDialogDescription>
        </div>
        <ResponsiveDialogFooter className="px-6 lg:px-8 pb-6 lg:pb-8 pt-12">
          <Button
            onClick={handleClose}
            className="w-full"
            size="xxl"
            data-testid="welcome-modal-cta-btn"
          >
            {t(($) => $.welcomeModal.cta)}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

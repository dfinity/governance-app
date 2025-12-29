import { Vote } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
} from '@common/components/ResponsiveDialog';
import { Button } from '@components/button';
import { WELCOME_MODAL_STORAGE_KEY } from '@constants/extra';

export function WelcomeModal() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenModal = localStorage.getItem(WELCOME_MODAL_STORAGE_KEY);
    if (!hasSeenModal) setIsOpen(true);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem(WELCOME_MODAL_STORAGE_KEY, 'true');
  };

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={setIsOpen}>
      <ResponsiveDialogContent className="flex flex-col gap-8 lg:max-w-xl lg:px-12">
        <div className="flex flex-col items-center gap-6">
          <div className="size-16">
            <Vote className="size-16 text-primary" />
          </div>
          <ResponsiveDialogTitle className="text-2xl">
            {t(($) => $.welcomeModal.title)}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="text-center text-[15px] text-pretty text-muted-foreground">
            {t(($) => $.welcomeModal.content)}
          </ResponsiveDialogDescription>
        </div>
        <ResponsiveDialogFooter>
          <Button onClick={handleClose} className="w-full" size="xl">
            {t(($) => $.welcomeModal.cta)}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

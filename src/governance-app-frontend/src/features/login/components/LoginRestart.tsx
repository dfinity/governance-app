import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';

// Long enough to stay out of the way while Internet Identity opens.
const SHOW_AFTER_MS = 3_000;

/** Opens Internet Identity again when its window closed before the login ended. */
export const LoginRestart = ({ onRestart }: { onRestart: () => void }) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => clearTimeout(timeout);
  }, []);

  // Hidden, not absent, so the overlay content does not move when it appears.
  return (
    <div className={`flex flex-col items-center gap-2 ${visible ? '' : 'invisible'}`}>
      <p className="text-sm text-muted-foreground">{t(($) => $.login.closedWindow)}</p>
      <Button variant="outline" size="sm" onClick={onRestart} data-testid="login-restart-btn">
        {t(($) => $.login.openAgain)}
      </Button>
    </div>
  );
};

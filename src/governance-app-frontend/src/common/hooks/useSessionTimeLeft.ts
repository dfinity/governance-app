import { isNullish } from '@dfinity/utils';

import { MILLISECONDS_IN_SECOND } from '@constants/extra';
import { useInternetIdentity } from '@hooks/useInternetIdentity';
import { useNowInSeconds } from '@hooks/useNowInSeconds';

type SessionTimeLeft = { minutes: number; seconds: number };

export const useSessionTimeLeft = (): SessionTimeLeft | null => {
  const { sessionEndsAtMs } = useInternetIdentity();
  const nowSeconds = useNowInSeconds();

  if (isNullish(sessionEndsAtMs)) return null;

  const timeLeft = Math.max(0, Math.floor(sessionEndsAtMs / MILLISECONDS_IN_SECOND) - nowSeconds);

  return {
    minutes: Math.floor(timeLeft / 60),
    seconds: timeLeft % 60,
  };
};

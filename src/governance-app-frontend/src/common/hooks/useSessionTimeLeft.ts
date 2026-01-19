import { useInternetIdentity } from 'ic-use-internet-identity';
import { useEffect, useState } from 'react';

export const useSessionTimeLeft = () => {
  const { identity } = useInternetIdentity();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const identityAny = identity as any;
    if (!identityAny || typeof identityAny.getDelegation !== 'function') {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      try {
        const delegation = identityAny.getDelegation();
        const expiration = delegation.delegations[0]?.delegation.expiration;
        if (expiration) {
          const remaining = Number(expiration / BigInt(1_000_000)) - Date.now();
          setTimeLeft(Math.max(0, Math.floor(remaining / 1000)));
        }
      } catch (e) {
        console.error('Failed to get session expiration', e);
        setTimeLeft(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [identity]);

  if (timeLeft === null) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return {
    minutes,
    seconds,
    totalSeconds: timeLeft,
  };
};


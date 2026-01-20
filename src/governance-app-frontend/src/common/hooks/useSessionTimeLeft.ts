import { useInternetIdentity } from 'ic-use-internet-identity';
import { useEffect, useState } from 'react';

type IdentityWithDelegation = {
  getDelegation: () => {
    delegations: Array<{
      delegation: {
        expiration: bigint;
      };
    }>;
  };
}

const hasGetDelegation = (obj: unknown): obj is IdentityWithDelegation => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'getDelegation' in obj &&
    typeof (obj as { getDelegation?: unknown }).getDelegation === 'function'
  );
};

export const useSessionTimeLeft = () => {
  const { identity } = useInternetIdentity();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!hasGetDelegation(identity)) {
      setTimeLeft(null);
      return;
    }

    const updateTimeLeft = () => {
      try {
        const delegation = identity.getDelegation();
        const expiration = delegation.delegations[0]?.delegation.expiration;
        if (expiration) {
          const remaining = Number(expiration / BigInt(1_000_000)) - Date.now();
          setTimeLeft(Math.max(0, Math.floor(remaining / 1000)));
        }
      } catch (e) {
        if (import.meta.env.DEV) {
          console.error('Failed to get session expiration', e);
        }
        setTimeLeft(null);
      }
    };

    // Calculate immediately
    updateTimeLeft();

    // Then update every second
    const interval = setInterval(updateTimeLeft, 1000);

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

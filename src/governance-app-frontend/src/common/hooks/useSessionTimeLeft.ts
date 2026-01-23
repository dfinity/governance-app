import { isNullish, nonNullish } from '@dfinity/utils';
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
};

const hasGetDelegation = (obj: unknown): obj is IdentityWithDelegation => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'getDelegation' in obj &&
    typeof (obj as { getDelegation?: unknown }).getDelegation === 'function'
  );
};

type SessionTimeLeft = { minutes: number; seconds: number };

export const useSessionTimeLeft = (): SessionTimeLeft | null => {
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
        if (isNullish(delegation)) return;

        // Find the earliest expiration in the chain
        let minExpiration: bigint | null = null;

        for (const d of delegation.delegations) {
          const exp = d.delegation.expiration;
          if (isNullish(minExpiration) || exp < minExpiration) minExpiration = exp;
        }

        if (nonNullish(minExpiration)) {
          const remaining = Number(minExpiration / BigInt(1_000_000)) - Date.now();
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

  if (isNullish(timeLeft)) return null;

  return {
    minutes: Math.floor(timeLeft / 60),
    seconds: timeLeft % 60,
  };
};

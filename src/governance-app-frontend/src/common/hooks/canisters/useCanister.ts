import { createActorHook, CreateActorHookOptions } from 'ic-use-actor';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useEffect } from 'react';

export const useCanister = <T>(options: CreateActorHookOptions) => {
  const { identity } = useInternetIdentity();
  const actor = createActorHook<T>(options)();
  const { authenticate } = actor;

  useEffect(() => {
    if (identity) {
      authenticate(identity);
    }
  }, [identity, authenticate]);

  return actor;
};

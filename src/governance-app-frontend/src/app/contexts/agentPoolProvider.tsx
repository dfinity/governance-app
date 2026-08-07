import { useInternetIdentity } from 'ic-use-internet-identity';
import { ReactNode, useEffect, useState } from 'react';

import {
  clearAuthenticatedAgent,
  getAnonymousAgent,
  getAuthenticatedAgent,
} from '@common/canisters/agents';

import { AgentPool, AgentPoolContext } from './agentPoolContext';

export const AgentPoolProvider = ({ children }: { children: ReactNode }) => {
  const [agentPool, setAgentPool] = useState<AgentPool>({
    anonymous: {
      agent: undefined,
      loading: true,
      error: undefined,
    },
    authenticated: {
      agent: undefined,
      loading: false,
      error: undefined,
    },
  });

  useEffect(() => {
    getAnonymousAgent()
      .then((agent) => {
        setAgentPool((prev) => ({
          ...prev,
          anonymous: {
            agent,
            loading: false,
            error: undefined,
          },
        }));
      })
      .catch((error) => {
        console.error('AgentPoolProvider: failed to create anonymous agent.', error);
        setAgentPool((prev) => ({
          ...prev,
          anonymous: {
            agent: undefined,
            loading: false,
            error,
          },
        }));
      });
  }, []);

  const { identity } = useInternetIdentity();
  useEffect(() => {
    if (identity) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAgentPool((prev) => ({
        ...prev,
        authenticated: {
          agent: undefined,
          loading: true,
          error: undefined,
        },
      }));

      getAuthenticatedAgent(identity)
        .then((agent) => {
          setAgentPool((prev) => ({
            ...prev,
            authenticated: {
              agent,
              loading: false,
              error: undefined,
            },
          }));
        })
        .catch((error) => {
          console.error('AgentPoolProvider: failed to create authenticated agent.', error);
          setAgentPool((prev) => ({
            ...prev,
            authenticated: {
              agent: undefined,
              loading: false,
              error,
            },
          }));
        });
    } else {
      // Drop the cached agent too, so a later login cannot reuse a stale identity.
      clearAuthenticatedAgent();
      setAgentPool((prev) => ({
        ...prev,
        authenticated: {
          agent: undefined,
          loading: false,
          error: undefined,
        },
      }));
    }
  }, [identity]);

  return <AgentPoolContext.Provider value={{ agentPool }}>{children}</AgentPoolContext.Provider>;
};

import { AnonymousIdentity } from '@icp-sdk/core/agent';
import { createAgent } from '@dfinity/utils';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { ReactNode, useEffect, useState } from 'react';

import { IS_LOCAL, NETWORK } from '@constants/extra';

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
    createAgent({
      identity: new AnonymousIdentity(),
      host: NETWORK,
      fetchRootKey: IS_LOCAL,
    })
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
      setAgentPool((prev) => ({
        ...prev,
        authenticated: {
          agent: undefined,
          loading: true,
          error: undefined,
        },
      }));

      createAgent({
        identity,
        host: NETWORK,
        fetchRootKey: IS_LOCAL,
      })
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

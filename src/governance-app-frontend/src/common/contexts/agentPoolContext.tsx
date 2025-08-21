import { HttpAgent } from '@dfinity/agent';
import { createContext } from 'react';

export type AgentPool = {
  anonymous: {
    agent: HttpAgent | undefined;
    loading: boolean;
    error: unknown;
  };
  authenticated: {
    agent: HttpAgent | undefined;
    loading: boolean;
    error: unknown;
  };
};

interface AgentPoolContext {
  agentPool: AgentPool;
}

export const AgentPoolContext = createContext<AgentPoolContext | undefined>(undefined);

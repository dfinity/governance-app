import { useContext } from 'react';

import { AgentPoolContext } from '@contexts/agentPoolContext';

export function useAgentPool() {
  const context = useContext(AgentPoolContext);
  if (!context) {
    throw new Error('useAgentPool must be used within an AgentPoolProvider context.');
  }

  return context;
}

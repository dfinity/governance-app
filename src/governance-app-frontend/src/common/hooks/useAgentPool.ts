import { useContext } from 'react';

import { AgentPoolContext } from '@contexts/agentPoolContext';
import { errorMessage } from '@utils/error';

export function useAgentPool() {
  const context = useContext(AgentPoolContext);
  if (!context) {
    throw errorMessage('useAgentPool', 'must be used within an AgentPoolProvider context');
  }

  return context;
}

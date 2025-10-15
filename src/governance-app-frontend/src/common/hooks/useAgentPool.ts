import { useContext } from 'react';

import { AgentPoolContext } from '@contexts/agentPoolContext';
import { triggerError } from '@utils/error';

export function useAgentPool() {
  const context = useContext(AgentPoolContext);
  if (!context) {
    return triggerError('useAgentPool', 'must be used within an AgentPoolProvider context');
  }

  return context;
}

'use client';

import { AgentCard } from './agent-card';

interface Agent {
  id: string;
  name: string;
  description?: string;
  avatarColor?: string;
  isActive?: boolean;
  skills?: { id: string; name: string; description?: string }[];
}

interface AgentListProps {
  agents: Agent[];
  showSkills?: boolean;
}

export function AgentList({ agents, showSkills = true }: AgentListProps) {
  if (agents.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500 dark:text-zinc-400">エージェントが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} showSkills={showSkills} />
      ))}
    </div>
  );
}

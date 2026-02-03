'use client';

import { useEffect, useState } from 'react';
import { AgentList } from '@/components/agents/agent-list';

interface Agent {
  id: string;
  name: string;
  description?: string;
  avatarColor?: string;
  isActive?: boolean;
  skills?: { id: string; name: string; description?: string }[];
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          エージェント
        </h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          エージェントをクリックしてチャットし、その機能を探索しましょう
        </p>
      </div>

      <AgentList agents={agents} showSkills={true} />

      {/* Agent Card Info */}
      <div className="mt-8 p-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
          Agent Cardsによるエージェント探索
        </h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          各エージェントは、A2A Protocolの仕様に従って、エンドポイントでAgent Cardを公開しています。
          Agent Cardには、エージェントの機能、スキル、対話方法に関する情報が含まれています。
        </p>
        <pre className="mt-4 p-4 rounded bg-zinc-900 text-zinc-100 text-xs overflow-x-auto">
{`GET /.well-known/agent.json

{
  "name": "Alice's Assistant",
  "url": "/api/agents/alice",
  "capabilities": { "streaming": false, "pushNotifications": false },
  "skills": [
    { "id": "check-availability", "name": "Check Availability", ... }
  ],
  "protocolVersions": ["1.0"]
}`}
        </pre>
      </div>
    </div>
  );
}

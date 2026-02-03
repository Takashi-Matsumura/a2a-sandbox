'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AgentAvatar } from '@/components/agents/agent-card';

interface Agent {
  id: string;
  name: string;
  description?: string;
  avatarColor?: string;
  isActive?: boolean;
}

interface DashboardStats {
  agents: number;
  schedules: number;
  tasks: number;
  initialized: boolean;
}

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Check database status
      const dbRes = await fetch('/api/db/init');
      const dbData = await dbRes.json();

      if (!dbData.initialized) {
        // Initialize database
        setInitializing(true);
        await fetch('/api/db/init', { method: 'POST' });
        setInitializing(false);
      }

      // Load agents
      const agentsRes = await fetch('/api/agents');
      const agentsData = await agentsRes.json();
      setAgents(agentsData.agents || []);

      // Load tasks count
      const tasksRes = await fetch('/api/tasks');
      const tasksData = await tasksRes.json();

      setStats({
        agents: agentsData.total || 0,
        schedules: dbData.schedules || 0,
        tasks: tasksData.total || 0,
        initialized: true,
      });
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || initializing) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-zinc-500 dark:text-zinc-400">
            {initializing ? 'データベースを初期化中...' : '読み込み中...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          A2A Protocol Sandbox
        </h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          インタラクティブな会議スケジューリングのデモを通じて、Google A2A (Agent-to-Agent) Protocolを学びましょう
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {stats?.agents || 0}
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">アクティブなエージェント</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {stats?.schedules || 0}
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">スケジュール項目</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {stats?.tasks || 0}
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">作成されたタスク</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>会議スケジューリングデモ</CardTitle>
            <CardDescription>
              3つのAIエージェント（Alice, Bob, Carol）がプライバシーを守りながら会議を調整する様子を見てみましょう
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/demo">
              <Button className="w-full">デモを開始</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>エージェントとチャット</CardTitle>
            <CardDescription>
              各エージェントと直接対話して、その機能を理解しましょう
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/agents">
              <Button variant="secondary" className="w-full">エージェント一覧</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Agents Overview */}
      <Card>
        <CardHeader>
          <CardTitle>エージェント</CardTitle>
          <CardDescription>
            各エージェントは、プライベートなスケジュールデータを持つパーソナルアシスタントです
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agents.map((agent) => (
              <Link
                key={agent.id}
                href={`/agents/${agent.id}`}
                className="flex items-center gap-4 p-4 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <AgentAvatar name={agent.name} color={agent.avatarColor} size="lg" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                      {agent.name}
                    </h3>
                    {agent.isActive && <Badge variant="success">アクティブ</Badge>}
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {agent.description}
                  </p>
                </div>
                <svg
                  className="w-5 h-5 text-zinc-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Protocol Info */}
      <div className="mt-8 p-6 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
        <h3 className="font-semibold text-indigo-900 dark:text-indigo-300">
          A2A Protocolについて
        </h3>
        <p className="mt-2 text-sm text-indigo-700 dark:text-indigo-400">
          GoogleのAgent-to-Agent (A2A) Protocolは、セキュリティとプライバシーを維持しながら、
          AIエージェント同士が通信・連携できるようにします。このサンドボックスでは、
          エージェント探索のためのAgent Cards、状態を持つやり取りのためのTasks、
          プライバシーを守るデータ共有などの主要な概念を実演します。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="info">JSON-RPC 2.0</Badge>
          <Badge variant="info">Agent Cards</Badge>
          <Badge variant="info">Task Management</Badge>
          <Badge variant="info">Privacy Filters</Badge>
        </div>
      </div>
    </div>
  );
}

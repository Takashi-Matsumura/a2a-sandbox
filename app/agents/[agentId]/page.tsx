'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChatWindow } from '@/components/chat/chat-window';
import { ScheduleGrid } from '@/components/schedule/schedule-grid';
import { AgentAvatar } from '@/components/agents/agent-card';

interface Agent {
  id: string;
  name: string;
  description?: string;
  avatarColor?: string;
  isActive?: boolean;
  agentCard?: {
    skills?: { id: string; name: string; description?: string }[];
    capabilities?: { streaming: boolean; pushNotifications: boolean };
  };
}

interface Schedule {
  startTime: string;
  endTime: string;
  visibility: 'busy' | 'available' | 'tentative';
  title?: string;
  isPrivate?: boolean;
}

interface Message {
  role: 'user' | 'agent';
  content: string;
  data?: Record<string, unknown>;
  timestamp?: string;
}

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'schedule' | 'agentCard'>('chat');

  useEffect(() => {
    loadAgent();
  }, [agentId]);

  const loadAgent = async () => {
    try {
      // Load agent details
      const agentRes = await fetch(`/api/agents/${agentId}`);
      if (!agentRes.ok) {
        router.push('/agents');
        return;
      }
      const agentData = await agentRes.json();
      setAgent(agentData);

      // Load schedule
      const scheduleRes = await fetch(`/api/agents/${agentId}/schedule`);
      const scheduleData = await scheduleRes.json();
      setSchedule(scheduleData.schedule || []);
    } catch (error) {
      console.error('Failed to load agent:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!agent) return;

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setSending(true);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          message: text,
        }),
      });

      const data = await res.json();

      if (data.task?.history) {
        // Get the agent's response from task history
        const agentMessages = data.task.history.filter((m: Message) => m.role === 'agent');
        const lastAgentMessage = agentMessages[agentMessages.length - 1];

        if (lastAgentMessage) {
          const textPart = lastAgentMessage.parts?.find((p: { type: string; text?: string }) => p.type === 'text');
          const dataPart = lastAgentMessage.parts?.find((p: { type: string; data?: Record<string, unknown> }) => p.type === 'data');

          setMessages((prev) => [
            ...prev,
            {
              role: 'agent',
              content: textPart?.text || 'No response',
              data: dataPart?.data,
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          content: 'エラーが発生しました。もう一度お試しください。',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!agent) {
    return null;
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <AgentAvatar name={agent.name} color={agent.avatarColor} size="lg" />
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {agent.name}
            </h1>
            {agent.isActive && <Badge variant="success">アクティブ</Badge>}
          </div>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">
            {agent.description}
          </p>
          {agent.agentCard?.skills && (
            <div className="mt-3 flex flex-wrap gap-2">
              {agent.agentCard.skills.map((skill) => (
                <Badge key={skill.id} variant="info">
                  {skill.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <Button variant="outline" onClick={() => router.push('/agents')}>
          エージェント一覧に戻る
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {['chat', 'schedule', 'agentCard'].map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'primary' : 'ghost'}
            onClick={() => setActiveTab(tab as typeof activeTab)}
          >
            {tab === 'agentCard' ? 'Agent Card' : tab === 'chat' ? 'チャット' : 'スケジュール'}
          </Button>
        ))}
      </div>

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {activeTab === 'chat' && (
            <Card className="h-[600px] flex flex-col">
              <div className="flex justify-between items-center px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {messages.length > 0 ? `${messages.length} 件のメッセージ` : ''}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMessages([])}
                  disabled={messages.length === 0}
                  className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                >
                  🗑️ クリア
                </Button>
              </div>
              <div className="flex-1 overflow-hidden">
                <ChatWindow
                  messages={messages}
                  onSend={handleSendMessage}
                  agentName={agent.name}
                  agentColor={agent.avatarColor}
                  loading={sending}
                />
              </div>
            </Card>
          )}

          {activeTab === 'schedule' && (
            <ScheduleGrid
              date={today}
              agentName={agent.name}
              agentColor={agent.avatarColor}
              busySlots={schedule.filter((s) => s.visibility === 'busy').map((s) => ({
                startTime: s.startTime,
                endTime: s.endTime,
                status: s.visibility,
                title: s.title,
                isPrivate: s.isPrivate,
              }))}
              showFreeSlots={true}
            />
          )}

          {activeTab === 'agentCard' && (
            <Card>
              <CardHeader>
                <CardTitle>Agent Card</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-sm overflow-x-auto">
                  {JSON.stringify(agent.agentCard, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>クイックアクション</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleSendMessage('What times are you busy today?')}
                disabled={sending}
              >
                今日のスケジュールを確認
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleSendMessage('Are you available from 14:00 to 15:00 today?')}
                disabled={sending}
              >
                14:00-15:00の空き状況を確認
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleSendMessage(`Schedule meeting "Team Sync" today from 14:00 to 15:00`)}
                disabled={sending}
              >
                会議を予約
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>機能</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className={agent.agentCard?.capabilities?.streaming ? 'text-green-500' : 'text-zinc-400'}>
                    {agent.agentCard?.capabilities?.streaming ? '✓' : '✗'}
                  </span>
                  ストリーミング
                </li>
                <li className="flex items-center gap-2">
                  <span className={agent.agentCard?.capabilities?.pushNotifications ? 'text-green-500' : 'text-zinc-400'}>
                    {agent.agentCard?.capabilities?.pushNotifications ? '✓' : '✗'}
                  </span>
                  プッシュ通知
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

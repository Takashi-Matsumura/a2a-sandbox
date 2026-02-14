'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DemoStepper, DemoProgress } from '@/components/demo/demo-stepper';
import { ProtocolViewer, createProtocolMessage } from '@/components/demo/protocol-viewer';
import { ScheduleGrid } from '@/components/schedule/schedule-grid';
import { AgentAvatar } from '@/components/agents/agent-card';

interface Agent {
  id: string;
  name: string;
  avatarColor?: string;
}

interface BusySlot {
  startTime: string;
  endTime: string;
  status: 'busy' | 'available' | 'tentative';
  title?: string;
}

interface ProtocolMessage {
  id: string;
  timestamp: string;
  direction: 'sent' | 'received';
  from: string;
  to: string;
  method?: string;
  type: 'request' | 'response' | 'event';
  payload: unknown;
  explanation?: string;
}

type StepStatus = 'pending' | 'active' | 'completed' | 'error';

interface Step {
  id: string;
  title: string;
  description: string;
  status: StepStatus;
}

const DEMO_STEPS: Step[] = [
  {
    id: 'discover',
    title: 'エージェント探索',
    description: 'OrchestratorがAlice、Bob、CarolのAgent Cardsを取得し、各エージェントの機能を把握します',
    status: 'pending',
  },
  {
    id: 'query-alice',
    title: 'Aliceに問い合わせ',
    description: 'Aliceのエージェントに空き状況確認リクエストを送信',
    status: 'pending',
  },
  {
    id: 'query-bob',
    title: 'Bobに問い合わせ',
    description: 'Bobのエージェントに空き状況確認リクエストを送信',
    status: 'pending',
  },
  {
    id: 'query-carol',
    title: 'Carolに問い合わせ',
    description: 'Carolのエージェントに空き状況確認リクエストを送信',
    status: 'pending',
  },
  {
    id: 'find-common',
    title: '共通の空き時間を検索',
    description: '応答を分析して、全員が参加可能な時間を見つけます',
    status: 'pending',
  },
  {
    id: 'schedule',
    title: '会議をスケジュール',
    description: '3人全員のカレンダーに会議を登録します',
    status: 'pending',
  },
];

export default function DemoPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [steps, setSteps] = useState<Step[]>(DEMO_STEPS);
  const [protocolMessages, setProtocolMessages] = useState<ProtocolMessage[]>([]);
  const [busySlotsByAgent, setBusySlotsByAgent] = useState<Record<string, BusySlot[]>>({});
  const [commonSlots, setCommonSlots] = useState<{ startTime: string; endTime: string }[]>([]);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    const res = await fetch('/api/agents');
    const data = await res.json();
    setAgents(data.agents || []);
  };

  const addProtocolMessage = useCallback((message: ProtocolMessage) => {
    setProtocolMessages((prev) => [...prev, message]);
  }, []);

  const updateStepStatus = (stepIndex: number, status: StepStatus) => {
    setSteps((prev) =>
      prev.map((step, i) =>
        i === stepIndex ? { ...step, status } : step
      )
    );
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const runDemo = async () => {
    setRunning(true);
    setCompleted(false);
    setProtocolMessages([]);
    setBusySlotsByAgent({});
    setCommonSlots([]);
    setSteps(DEMO_STEPS.map((s): Step => ({ ...s, status: 'pending' })));

    try {
      // Step 0: Agent Discovery
      setCurrentStep(0);
      updateStepStatus(0, 'active');
      await sleep(500);

      addProtocolMessage(
        createProtocolMessage({
          direction: 'sent',
          from: 'Orchestrator',
          to: 'Agent Discovery',
          method: 'GET /.well-known/agent.json',
          type: 'request',
          payload: { query: '?agent=alice,bob,carol' },
          explanation: 'Agent Cardsを取得して各エージェントの機能を探索（Fetching Agent Cards to discover capabilities）',
        })
      );

      await sleep(800);

      const agentCardsRes = await fetch('/.well-known/agent.json');
      const agentCards = await agentCardsRes.json();

      addProtocolMessage(
        createProtocolMessage({
          direction: 'received',
          from: 'Agent Discovery',
          to: 'Orchestrator',
          type: 'response',
          payload: agentCards,
          explanation: 'Agent Cardsを受信。スキル: check-availability（空き確認）, get-busy-slots（予定取得）, schedule-meeting（会議予約）',
        })
      );

      updateStepStatus(0, 'completed');
      await sleep(500);

      // Steps 1-3: Query each agent
      const agentIds = ['alice', 'bob', 'carol'];
      const newBusySlots: Record<string, BusySlot[]> = {};

      for (let i = 0; i < agentIds.length; i++) {
        const agentId = agentIds[i];
        const stepIndex = i + 1;
        const agent = agents.find((a) => a.id === agentId);

        setCurrentStep(stepIndex);
        updateStepStatus(stepIndex, 'active');
        await sleep(300);

        // Send request
        const requestPayload = {
          jsonrpc: '2.0',
          id: `req_${Date.now()}`,
          method: 'tasks/send',
          params: {
            message: {
              role: 'user',
              parts: [
                { type: 'text', text: `What times are you busy on ${today}?` },
                { type: 'data', data: { action: 'get-busy-slots', params: { date: today } } },
              ],
            },
          },
        };

        addProtocolMessage(
          createProtocolMessage({
            direction: 'sent',
            from: 'Orchestrator',
            to: `${agent?.name || agentId}'s Agent`,
            method: 'tasks/send',
            type: 'request',
            payload: requestPayload,
            explanation: `${agent?.name || agentId}に予定時間を問い合わせ中 ※プライベートな予定の詳細は公開されません`,
          })
        );

        await sleep(600);

        // Get schedule
        const scheduleRes = await fetch(`/api/agents/${agentId}/schedule?public=true`);
        const scheduleData = await scheduleRes.json();

        const busySlots: BusySlot[] = scheduleData.schedule.map((s: { startTime: string; endTime: string; status: string }) => ({
          startTime: s.startTime,
          endTime: s.endTime,
          status: s.status as 'busy' | 'available' | 'tentative',
        }));

        newBusySlots[agentId] = busySlots;
        setBusySlotsByAgent({ ...newBusySlots });

        addProtocolMessage(
          createProtocolMessage({
            direction: 'received',
            from: `${agent?.name || agentId}'s Agent`,
            to: 'Orchestrator',
            type: 'response',
            payload: {
              status: { state: 'completed' },
              busySlots: busySlots,
            },
            explanation: `${agent?.name || agentId}が予定時間のみを返答 ※プライベートな予定のタイトルや詳細は含まれていません`,
          })
        );

        updateStepStatus(stepIndex, 'completed');
        await sleep(400);
      }

      // Step 4: Find common slots
      setCurrentStep(4);
      updateStepStatus(4, 'active');
      await sleep(500);

      // Calculate common free slots
      const allBusySlots = Object.values(newBusySlots).flat();
      const workHours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

      const freeSlots = workHours.filter((hour) => {
        const hourEnd = `${(parseInt(hour.split(':')[0]) + 1).toString().padStart(2, '0')}:00`;
        return !allBusySlots.some(
          (busy) => busy.startTime < hourEnd && busy.endTime > hour
        );
      }).map((hour) => ({
        startTime: hour,
        endTime: `${(parseInt(hour.split(':')[0]) + 1).toString().padStart(2, '0')}:00`,
      }));

      setCommonSlots(freeSlots);

      addProtocolMessage(
        createProtocolMessage({
          direction: 'sent',
          from: 'Orchestrator',
          to: 'Analysis',
          type: 'event',
          payload: {
            action: 'find-common-availability',
            participants: agentIds,
            busySlotCount: allBusySlots.length,
          },
          explanation: '全参加者のスケジュールを分析し、共通の空き時間を検索中',
        })
      );

      await sleep(800);

      addProtocolMessage(
        createProtocolMessage({
          direction: 'received',
          from: 'Analysis',
          to: 'Orchestrator',
          type: 'response',
          payload: {
            commonFreeSlots: freeSlots,
            message: freeSlots.length > 0
              ? `Found ${freeSlots.length} common available time slot(s)`
              : 'No common free slots found',
          },
          explanation: freeSlots.length > 0
            ? `成功！全員が参加可能な時間帯が ${freeSlots.length} 件見つかりました`
            : '共通の空き時間が見つかりませんでした',
        })
      );

      updateStepStatus(4, 'completed');
      await sleep(500);

      // Step 5: Schedule meeting
      setCurrentStep(5);
      updateStepStatus(5, 'active');
      await sleep(300);

      if (freeSlots.length > 0) {
        const selectedSlot = freeSlots[0];

        addProtocolMessage(
          createProtocolMessage({
            direction: 'sent',
            from: 'Orchestrator',
            to: 'All Agents',
            method: 'tasks/send',
            type: 'request',
            payload: {
              action: 'schedule-meeting',
              params: {
                title: 'Team Sync',
                date: today,
                startTime: selectedSlot.startTime,
                endTime: selectedSlot.endTime,
                participants: ['alice', 'bob', 'carol'],
              },
            },
            explanation: `"Team Sync" を ${selectedSlot.startTime} に予約中（最初の空き時間を選択）`,
          })
        );

        await sleep(1000);

        addProtocolMessage(
          createProtocolMessage({
            direction: 'received',
            from: 'All Agents',
            to: 'Orchestrator',
            type: 'response',
            payload: {
              success: true,
              meeting: {
                title: 'Team Sync',
                date: today,
                time: `${selectedSlot.startTime} - ${selectedSlot.endTime}`,
                participants: ['Alice', 'Bob', 'Carol'],
              },
            },
            explanation: '会議が全員のカレンダーに正常に登録されました！',
          })
        );

        updateStepStatus(5, 'completed');
      } else {
        addProtocolMessage(
          createProtocolMessage({
            direction: 'received',
            from: 'Orchestrator',
            to: 'User',
            type: 'response',
            payload: {
              success: false,
              message: 'Could not find a common time slot for all participants',
            },
            explanation: 'スケジュールできませんでした - 共通の空き時間がありません',
          })
        );

        updateStepStatus(5, 'error');
      }

      setCompleted(true);
    } catch (error) {
      console.error('Demo error:', error);
    } finally {
      setRunning(false);
    }
  };

  const resetDemo = () => {
    setCurrentStep(-1);
    setSteps(DEMO_STEPS.map((s): Step => ({ ...s, status: 'pending' })));
    setProtocolMessages([]);
    setBusySlotsByAgent({});
    setCommonSlots([]);
    setCompleted(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          会議スケジューリングデモ
        </h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          3つのAIエージェントがA2A Protocolを使用して、プライベートなスケジュール詳細を保護しながら会議を調整する様子をご覧ください
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mb-8">
        <Button onClick={runDemo} disabled={running} loading={running}>
          {running ? 'デモ実行中...' : completed ? '再実行' : 'デモを開始'}
        </Button>
        <Button variant="outline" onClick={resetDemo} disabled={running}>
          リセット
        </Button>
        {completed && (
          <Badge variant="success" size="md">
            デモ完了
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Steps and Agent Schedules */}
        <div className="space-y-6">
          {/* Progress */}
          <Card>
            <CardHeader>
              <CardTitle>デモの進捗</CardTitle>
            </CardHeader>
            <CardContent>
              <DemoProgress
                current={Math.max(0, currentStep + 1)}
                total={steps.length}
                label="完了したステップ"
              />
              <div className="mt-6">
                <DemoStepper steps={steps} currentStep={currentStep} />
              </div>
            </CardContent>
          </Card>

          {/* Agents */}
          <Card>
            <CardHeader>
              <CardTitle>参加者</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {agents.map((agent) => (
                  <div key={agent.id} className="flex items-center gap-3">
                    <AgentAvatar name={agent.name} color={agent.avatarColor} size="sm" />
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {agent.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {busySlotsByAgent[agent.id]?.length || 0} 件の予定
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Common Slots */}
          {commonSlots.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>共通の空き時間</CardTitle>
                <CardDescription>
                  全員が参加可能な時間
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {commonSlots.map((slot, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
                    >
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm font-medium">
                        {slot.startTime} - {slot.endTime}
                      </span>
                      {i === 0 && (
                        <Badge variant="success" size="sm">
                          選択済み
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: Protocol Messages */}
        <div className="lg:col-span-2">
          <ProtocolViewer
            messages={protocolMessages}
            title="A2A Protocolメッセージ"
            showExplanations={true}
          />

          {/* Privacy Info */}
          <div className="mt-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <h4 className="font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              プライバシー保護の実例
            </h4>
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
              エージェントは<strong>予定あり/空き状態</strong>と<strong>時間帯</strong>のみを共有し、
              プライベートな予定のタイトルや詳細は決して共有しないことに注目してください。
              これがA2A Protocolのプライバシー保護設計です。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

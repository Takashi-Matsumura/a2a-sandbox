'use client';

import { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DemoStepper, DemoProgress } from '@/components/demo/demo-stepper';
import { ProtocolViewer, createProtocolMessage } from '@/components/demo/protocol-viewer';
import { AgentAvatar } from '@/components/agents/agent-card';
import { DebateTranscript, type DebateEntry } from '@/components/demo/debate-transcript';
import { generateSummary } from '@/lib/agents/debate/templates';

/**
 * Extract agent response text from JSON-RPC task result.
 * The task store doesn't persist status.message, so we read from history instead.
 */
function extractAgentText(response: Record<string, unknown>): string | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const history = (response?.result as any)?.history as Array<{ role: string; parts: Array<{ type: string; text?: string }> }> | undefined;
  if (!history) return undefined;
  const agentMessages = history.filter((m) => m.role === 'agent');
  const lastMessage = agentMessages[agentMessages.length - 1];
  return lastMessage?.parts?.find((p) => p.type === 'text')?.text;
}

/**
 * Generate debate summary via LLM, with template fallback
 */
async function generateDebateSummary(
  topic: string,
  proArgs: string[],
  conArgs: string[]
): Promise<string> {
  try {
    const res = await fetch('/api/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'あなたはディベートの司会者です。両者の議論を公平にまとめてください。必ず日本語で回答してください。300〜500文字程度で簡潔にまとめてください。',
          },
          {
            role: 'user',
            content: `テーマ「${topic}」についてのディベートを総括してください。\n\n【賛成派の主張】\n${proArgs.map((a, i) => `${i + 1}. ${a}`).join('\n\n')}\n\n【反対派の主張】\n${conArgs.map((a, i) => `${i + 1}. ${a}`).join('\n\n')}`,
          },
        ],
        temperature: 0.7,
        maxTokens: 600,
      }),
    });
    const data = await res.json();
    if (data.content && !data.content.includes("I'm sorry")) {
      return data.content;
    }
  } catch {
    // LLM unavailable, use template fallback
  }
  return generateSummary(topic, proArgs, conArgs);
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

const DEBATE_AGENTS = {
  'pro-kun': { name: '賛成くん', color: '#f97316', stance: 'pro' as const },
  'con-kun': { name: '反対くん', color: '#8b5cf6', stance: 'con' as const },
};

const DEMO_STEPS: Step[] = [
  {
    id: 'discover',
    title: 'エージェント探索',
    description: 'Agent Cardsを取得し、ディベートエージェントの機能を確認します',
    status: 'pending',
  },
  {
    id: 'set-topic',
    title: 'テーマ設定',
    description: '両エージェントにディベートのテーマを通知します',
    status: 'pending',
  },
  {
    id: 'pro-argue',
    title: '賛成派の主張',
    description: '賛成くんがテーマに対する賛成意見を展開します',
    status: 'pending',
  },
  {
    id: 'con-argue',
    title: '反対派の主張',
    description: '反対くんがテーマに対する反対意見を展開します',
    status: 'pending',
  },
  {
    id: 'pro-rebut',
    title: '賛成派の反論',
    description: '賛成くんが反対派の主張に対して反論します',
    status: 'pending',
  },
  {
    id: 'con-rebut',
    title: '反対派の反論',
    description: '反対くんが賛成派の主張に対して反論します',
    status: 'pending',
  },
  {
    id: 'summary',
    title: 'まとめ',
    description: 'ディベートの内容を総括します',
    status: 'pending',
  },
];

export default function DebateDemoPage() {
  const [topic, setTopic] = useState('');
  const [currentStep, setCurrentStep] = useState(-1);
  const [steps, setSteps] = useState<Step[]>(DEMO_STEPS);
  const [protocolMessages, setProtocolMessages] = useState<ProtocolMessage[]>([]);
  const [debateEntries, setDebateEntries] = useState<DebateEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [summaryText, setSummaryText] = useState('');

  const addProtocolMessage = useCallback((message: ProtocolMessage) => {
    setProtocolMessages((prev) => [...prev, message]);
  }, []);

  const addDebateEntry = useCallback((entry: DebateEntry) => {
    setDebateEntries((prev) => [...prev, entry]);
  }, []);

  const updateStepStatus = (stepIndex: number, status: StepStatus) => {
    setSteps((prev) =>
      prev.map((step, i) =>
        i === stepIndex ? { ...step, status } : step
      )
    );
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  /**
   * Send a debate action to an agent via JSON-RPC
   */
  const sendDebateAction = async (
    agentId: string,
    action: 'debate-argue' | 'debate-rebut',
    params: Record<string, unknown>
  ) => {
    const requestPayload = {
      jsonrpc: '2.0',
      id: `req_${Date.now()}`,
      method: 'tasks/send',
      params: {
        message: {
          role: 'user',
          parts: [
            {
              type: 'data',
              data: { action, params },
            },
          ],
        },
      },
    };

    const res = await fetch(`/api/agents/${agentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });

    return res.json();
  };

  const runDebate = async () => {
    if (!topic.trim()) return;

    setRunning(true);
    setCompleted(false);
    setProtocolMessages([]);
    setDebateEntries([]);
    setSummaryText('');
    setSteps(DEMO_STEPS.map((s): Step => ({ ...s, status: 'pending' })));

    const proArgs: string[] = [];
    const conArgs: string[] = [];

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
          payload: { query: '?agent=pro-kun,con-kun' },
          explanation: 'ディベートエージェントのAgent Cardsを取得し、debate-argue / debate-rebut スキルを確認',
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
          explanation: 'Agent Cardsを受信。スキル: debate-argue（主張）, debate-rebut（反論）',
        })
      );

      updateStepStatus(0, 'completed');
      await sleep(500);

      // Step 1: Set Topic
      setCurrentStep(1);
      updateStepStatus(1, 'active');
      await sleep(300);

      addProtocolMessage(
        createProtocolMessage({
          direction: 'sent',
          from: 'Orchestrator',
          to: '賛成くん & 反対くん',
          type: 'event',
          payload: {
            action: 'set-topic',
            topic: topic,
            participants: ['pro-kun', 'con-kun'],
          },
          explanation: `ディベートのテーマを設定: 「${topic}」`,
        })
      );

      await sleep(600);

      addProtocolMessage(
        createProtocolMessage({
          direction: 'received',
          from: '賛成くん & 反対くん',
          to: 'Orchestrator',
          type: 'response',
          payload: {
            acknowledged: true,
            topic: topic,
            roles: { 'pro-kun': '賛成派', 'con-kun': '反対派' },
          },
          explanation: '両エージェントがテーマを受信し、ディベートの準備が完了しました',
        })
      );

      updateStepStatus(1, 'completed');
      await sleep(500);

      // Step 2: Pro Argue
      setCurrentStep(2);
      updateStepStatus(2, 'active');
      await sleep(300);

      const proArguePayload = {
        jsonrpc: '2.0',
        id: `req_${Date.now()}`,
        method: 'tasks/send',
        params: {
          message: {
            role: 'user',
            parts: [{ type: 'data', data: { action: 'debate-argue', params: { topic } } }],
          },
        },
      };

      addProtocolMessage(
        createProtocolMessage({
          direction: 'sent',
          from: 'Orchestrator',
          to: '賛成くん',
          method: 'tasks/send',
          type: 'request',
          payload: proArguePayload,
          explanation: '賛成くんに主張を依頼（action: debate-argue）',
        })
      );

      await sleep(600);

      const proArgueRes = await sendDebateAction('pro-kun', 'debate-argue', { topic });
      const proArgueText = extractAgentText(proArgueRes) || '主張を生成できませんでした';
      proArgs.push(proArgueText);

      addProtocolMessage(
        createProtocolMessage({
          direction: 'received',
          from: '賛成くん',
          to: 'Orchestrator',
          type: 'response',
          payload: proArgueRes?.result || proArgueRes,
          explanation: '賛成くんが賛成の立場から主張を展開しました',
        })
      );

      addDebateEntry({
        id: `entry_${Date.now()}_pro_argue`,
        agentId: 'pro-kun',
        agentName: DEBATE_AGENTS['pro-kun'].name,
        agentColor: DEBATE_AGENTS['pro-kun'].color,
        stance: 'pro',
        phase: 'argue',
        text: proArgueText,
      });

      updateStepStatus(2, 'completed');
      await sleep(500);

      // Step 3: Con Argue
      setCurrentStep(3);
      updateStepStatus(3, 'active');
      await sleep(300);

      const conArguePayload = {
        jsonrpc: '2.0',
        id: `req_${Date.now()}`,
        method: 'tasks/send',
        params: {
          message: {
            role: 'user',
            parts: [{ type: 'data', data: { action: 'debate-argue', params: { topic } } }],
          },
        },
      };

      addProtocolMessage(
        createProtocolMessage({
          direction: 'sent',
          from: 'Orchestrator',
          to: '反対くん',
          method: 'tasks/send',
          type: 'request',
          payload: conArguePayload,
          explanation: '反対くんに主張を依頼（action: debate-argue）',
        })
      );

      await sleep(600);

      const conArgueRes = await sendDebateAction('con-kun', 'debate-argue', { topic });
      const conArgueText = extractAgentText(conArgueRes) || '主張を生成できませんでした';
      conArgs.push(conArgueText);

      addProtocolMessage(
        createProtocolMessage({
          direction: 'received',
          from: '反対くん',
          to: 'Orchestrator',
          type: 'response',
          payload: conArgueRes?.result || conArgueRes,
          explanation: '反対くんが反対の立場から主張を展開しました',
        })
      );

      addDebateEntry({
        id: `entry_${Date.now()}_con_argue`,
        agentId: 'con-kun',
        agentName: DEBATE_AGENTS['con-kun'].name,
        agentColor: DEBATE_AGENTS['con-kun'].color,
        stance: 'con',
        phase: 'argue',
        text: conArgueText,
      });

      updateStepStatus(3, 'completed');
      await sleep(500);

      // Step 4: Pro Rebut
      setCurrentStep(4);
      updateStepStatus(4, 'active');
      await sleep(300);

      const proRebutPayload = {
        jsonrpc: '2.0',
        id: `req_${Date.now()}`,
        method: 'tasks/send',
        params: {
          message: {
            role: 'user',
            parts: [{
              type: 'data',
              data: {
                action: 'debate-rebut',
                params: { topic, opponentArgument: conArgueText },
              },
            }],
          },
        },
      };

      addProtocolMessage(
        createProtocolMessage({
          direction: 'sent',
          from: 'Orchestrator',
          to: '賛成くん',
          method: 'tasks/send',
          type: 'request',
          payload: proRebutPayload,
          explanation: '賛成くんに反対派の主張への反論を依頼（action: debate-rebut）',
        })
      );

      await sleep(600);

      const proRebutRes = await sendDebateAction('pro-kun', 'debate-rebut', {
        topic,
        opponentArgument: conArgueText,
      });
      const proRebutText = extractAgentText(proRebutRes) || '反論を生成できませんでした';
      proArgs.push(proRebutText);

      addProtocolMessage(
        createProtocolMessage({
          direction: 'received',
          from: '賛成くん',
          to: 'Orchestrator',
          type: 'response',
          payload: proRebutRes?.result || proRebutRes,
          explanation: '賛成くんが反対派の主張に対する反論を展開しました',
        })
      );

      addDebateEntry({
        id: `entry_${Date.now()}_pro_rebut`,
        agentId: 'pro-kun',
        agentName: DEBATE_AGENTS['pro-kun'].name,
        agentColor: DEBATE_AGENTS['pro-kun'].color,
        stance: 'pro',
        phase: 'rebut',
        text: proRebutText,
      });

      updateStepStatus(4, 'completed');
      await sleep(500);

      // Step 5: Con Rebut
      setCurrentStep(5);
      updateStepStatus(5, 'active');
      await sleep(300);

      const conRebutPayload = {
        jsonrpc: '2.0',
        id: `req_${Date.now()}`,
        method: 'tasks/send',
        params: {
          message: {
            role: 'user',
            parts: [{
              type: 'data',
              data: {
                action: 'debate-rebut',
                params: { topic, opponentArgument: proArgueText },
              },
            }],
          },
        },
      };

      addProtocolMessage(
        createProtocolMessage({
          direction: 'sent',
          from: 'Orchestrator',
          to: '反対くん',
          method: 'tasks/send',
          type: 'request',
          payload: conRebutPayload,
          explanation: '反対くんに賛成派の主張への反論を依頼（action: debate-rebut）',
        })
      );

      await sleep(600);

      const conRebutRes = await sendDebateAction('con-kun', 'debate-rebut', {
        topic,
        opponentArgument: proArgueText,
      });
      const conRebutText = extractAgentText(conRebutRes) || '反論を生成できませんでした';
      conArgs.push(conRebutText);

      addProtocolMessage(
        createProtocolMessage({
          direction: 'received',
          from: '反対くん',
          to: 'Orchestrator',
          type: 'response',
          payload: conRebutRes?.result || conRebutRes,
          explanation: '反対くんが賛成派の主張に対する反論を展開しました',
        })
      );

      addDebateEntry({
        id: `entry_${Date.now()}_con_rebut`,
        agentId: 'con-kun',
        agentName: DEBATE_AGENTS['con-kun'].name,
        agentColor: DEBATE_AGENTS['con-kun'].color,
        stance: 'con',
        phase: 'rebut',
        text: conRebutText,
      });

      updateStepStatus(5, 'completed');
      await sleep(500);

      // Step 6: Summary
      setCurrentStep(6);
      updateStepStatus(6, 'active');
      await sleep(300);

      addProtocolMessage(
        createProtocolMessage({
          direction: 'sent',
          from: 'Orchestrator',
          to: 'Summary',
          type: 'event',
          payload: {
            action: 'generate-summary',
            topic,
            proArgumentCount: proArgs.length,
            conArgumentCount: conArgs.length,
          },
          explanation: 'ディベートの内容を分析し、総括を生成中',
        })
      );

      await sleep(800);

      const summary = await generateDebateSummary(topic, proArgs, conArgs);
      setSummaryText(summary);

      addProtocolMessage(
        createProtocolMessage({
          direction: 'received',
          from: 'Summary',
          to: 'Orchestrator',
          type: 'response',
          payload: {
            summary,
            totalArguments: proArgs.length + conArgs.length,
          },
          explanation: 'ディベートの総括が完成しました',
        })
      );

      updateStepStatus(6, 'completed');
      setCompleted(true);
    } catch (error) {
      console.error('Debate demo error:', error);
    } finally {
      setRunning(false);
    }
  };

  const resetDemo = () => {
    setCurrentStep(-1);
    setSteps(DEMO_STEPS.map((s): Step => ({ ...s, status: 'pending' })));
    setProtocolMessages([]);
    setDebateEntries([]);
    setSummaryText('');
    setCompleted(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          エージェントディベートデモ
        </h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          賛成くんと反対くんがA2A Protocolを通じてディベートを行う様子をリアルタイムで可視化します
        </p>
      </div>

      {/* Topic Input & Controls */}
      <div className="flex items-end gap-4 mb-8">
        <div className="flex-1">
          <label
            htmlFor="topic"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
          >
            ディベートのテーマ
          </label>
          <Input
            id="topic"
            placeholder="例: リモートワークの全面導入、AIによる自動運転の義務化..."
            value={topic}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTopic(e.target.value)}
            disabled={running}
          />
        </div>
        <Button
          onClick={runDebate}
          disabled={running || !topic.trim()}
          loading={running}
        >
          {running ? 'ディベート中...' : completed ? '再実行' : 'ディベート開始'}
        </Button>
        <Button variant="outline" onClick={resetDemo} disabled={running}>
          リセット
        </Button>
        {completed && (
          <Badge variant="success" size="md">
            ディベート完了
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Steps + Debaters */}
        <div className="space-y-6">
          {/* Progress */}
          <Card>
            <CardHeader>
              <CardTitle>ディベートの進捗</CardTitle>
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

          {/* Debaters */}
          <Card>
            <CardHeader>
              <CardTitle>ディベーター</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(DEBATE_AGENTS).map(([id, agent]) => (
                  <div key={id} className="flex items-center gap-3">
                    <AgentAvatar name={agent.name} color={agent.color} size="sm" />
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {agent.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {agent.stance === 'pro' ? '賛成派' : '反対派'}
                      </p>
                    </div>
                    <Badge
                      className={
                        agent.stance === 'pro'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }
                      size="sm"
                    >
                      {agent.stance === 'pro' ? 'PRO' : 'CON'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          {summaryText && (
            <Card>
              <CardHeader>
                <CardTitle>ディベート総括</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {summaryText}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: Protocol Messages + Debate Transcript */}
        <div className="lg:col-span-2 space-y-6">
          <ProtocolViewer
            messages={protocolMessages}
            title="A2A Protocolメッセージ"
            showExplanations={true}
          />

          {debateEntries.length > 0 && (
            <DebateTranscript entries={debateEntries} />
          )}

          {/* Info Box */}
          <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
            <h4 className="font-semibold text-orange-900 dark:text-orange-300 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              A2Aによるエージェント間ディベート
            </h4>
            <p className="mt-2 text-sm text-orange-700 dark:text-orange-400">
              このデモでは、2つのエージェントがA2A Protocolの<strong>tasks/send</strong>メソッドを使って
              ディベートを行います。各エージェントは<strong>debate-argue</strong>と<strong>debate-rebut</strong>
              スキルを持ち、テンプレートベースで主張と反論を生成します。
              Orchestratorがエージェント間の対話を調整し、結果をまとめます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { ProtocolViewer, createProtocolMessage } from '@/components/demo/protocol-viewer';
import { generateSummary } from '@/lib/agents/debate/templates';

// ─── Types ──────────────────────────────────────────────

type Phase = 'select' | 'battle' | 'result';
type Round = 1 | 2 | 3; // 1=主張, 2=反論, 3=Final
type Speaker = 'pro' | 'con' | null;

interface SpeechBubble {
  id: string;
  speaker: 'pro' | 'con';
  round: Round;
  phase: 'argue' | 'rebut' | 'summary';
  text: string;
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

interface ThemeOption {
  id: string;
  emoji: string;
  title: string;
  topic: string;
}

// ─── Constants ──────────────────────────────────────────

const THEMES: ThemeOption[] = [
  { id: 'homework', emoji: '📚', title: '宿題廃止論', topic: '学校の宿題は廃止すべきか' },
  { id: 'pet', emoji: '🐱', title: '猫 vs 犬', topic: '猫と犬、ペットとして優れているのは？' },
  { id: 'cashless', emoji: '💳', title: 'キャッシュレス社会', topic: '現金は完全に廃止してキャッシュレスにすべきか' },
  { id: 'ai-work', emoji: '🤖', title: 'AI vs 人間の仕事', topic: 'AIが人間の仕事をすべて代替すべきか' },
  { id: 'time', emoji: '⏰', title: 'タイムマシン論争', topic: 'タイムマシンが発明されたら過去と未来どちらに行くべきか' },
  { id: 'lifestyle', emoji: '🌅', title: '朝型 vs 夜型', topic: '朝型と夜型、どちらが優れたライフスタイルか' },
];

const AGENTS = {
  pro: { id: 'pro-kun', name: '賛成くん', color: '#f97316', label: 'PRO' },
  con: { id: 'con-kun', name: '反対くん', color: '#8b5cf6', label: 'CON' },
};

const ROUND_LABELS: Record<Round, string> = {
  1: 'Round 1 - 主張',
  2: 'Round 2 - 反論',
  3: 'Final - まとめ',
};

// ─── Helpers (reused from existing debate demo) ─────────

function extractAgentText(response: Record<string, unknown>): string | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const history = (response?.result as any)?.history as
    | Array<{ role: string; parts: Array<{ type: string; text?: string }> }>
    | undefined;
  if (!history) return undefined;
  const agentMessages = history.filter((m) => m.role === 'agent');
  const lastMessage = agentMessages[agentMessages.length - 1];
  return lastMessage?.parts?.find((p) => p.type === 'text')?.text;
}

async function generateDebateSummary(
  topic: string,
  proArgs: string[],
  conArgs: string[],
): Promise<string> {
  try {
    const res = await fetch('/api/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content:
              'あなたはディベートの司会者です。両者の議論を公平にまとめてください。必ず日本語で回答してください。300〜500文字程度で簡潔にまとめてください。',
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
    // LLM unavailable — use template fallback
  }
  return generateSummary(topic, proArgs, conArgs);
}

// ─── Sub-components ─────────────────────────────────────

function ThinkingIndicator({ speaker }: { speaker: 'pro' | 'con' }) {
  const agent = AGENTS[speaker];
  return (
    <div className={`flex items-center gap-2 ${speaker === 'pro' ? 'justify-start' : 'justify-end'}`}>
      <div
        className="px-4 py-3 rounded-2xl text-sm"
        style={{
          backgroundColor: speaker === 'pro' ? '#fff7ed' : '#f5f3ff',
          border: `1px solid ${agent.color}33`,
        }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500 text-sm">{agent.name} 考え中</span>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block w-2 h-2 rounded-full animate-thinking-dot"
              style={{
                backgroundColor: agent.color,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SpeechBubbleComponent({ bubble }: { bubble: SpeechBubble }) {
  const isPro = bubble.speaker === 'pro';
  const agent = AGENTS[bubble.speaker];

  return (
    <div
      className={`flex ${isPro ? 'justify-start' : 'justify-end'} animate-fade-in-up`}
    >
      <div
        className="max-w-[85%] rounded-2xl px-5 py-4 shadow-sm relative"
        style={{
          backgroundColor: isPro ? '#fff7ed' : '#f5f3ff',
          border: `1px solid ${agent.color}33`,
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: agent.color }}
          >
            {agent.name.charAt(0)}
          </div>
          <span className="text-xs font-semibold" style={{ color: agent.color }}>
            {agent.name}
          </span>
          <span className="text-xs text-zinc-400">
            {bubble.phase === 'argue' ? '主張' : bubble.phase === 'rebut' ? '反論' : 'まとめ'}
          </span>
        </div>
        <p className="text-sm text-zinc-700 dark:text-zinc-800 leading-relaxed whitespace-pre-wrap">
          {bubble.text}
        </p>
      </div>
    </div>
  );
}

function VSBadge() {
  return (
    <div className="flex justify-center my-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-purple-500 flex items-center justify-center shadow-lg animate-fade-in-up">
          <span className="text-white font-black text-xl tracking-tighter">VS</span>
        </div>
      </div>
    </div>
  );
}

function AgentFigure({
  side,
  active,
}: {
  side: 'pro' | 'con';
  active: boolean;
}) {
  const agent = AGENTS[side];
  const animClass = side === 'pro' ? 'animate-slide-in-left' : 'animate-slide-in-right';

  return (
    <div className={`flex flex-col items-center gap-2 ${animClass}`}>
      <div
        className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold transition-all duration-300 ${active ? 'animate-pulse-glow scale-110' : 'opacity-70 scale-100'}`}
        style={{
          backgroundColor: agent.color,
          '--glow-color': `${agent.color}66`,
        } as React.CSSProperties}
      >
        {agent.name.charAt(0)}
      </div>
      <div className="text-center">
        <p className="font-bold text-zinc-900 dark:text-zinc-100">{agent.name}</p>
        <span
          className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold text-white"
          style={{ backgroundColor: agent.color }}
        >
          {agent.label}
        </span>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────

export default function DebateShowPage() {
  const [phase, setPhase] = useState<Phase>('select');
  const [selectedTheme, setSelectedTheme] = useState<ThemeOption | null>(null);
  const [round, setRound] = useState<Round>(1);
  const [activeSpeaker, setActiveSpeaker] = useState<Speaker>(null);
  const [thinking, setThinking] = useState(false);
  const [bubbles, setBubbles] = useState<SpeechBubble[]>([]);
  const [summaryText, setSummaryText] = useState('');
  const [protocolMessages, setProtocolMessages] = useState<ProtocolMessage[]>([]);
  const [showProtocol, setShowProtocol] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addProtocolMessage = useCallback((msg: ProtocolMessage) => {
    setProtocolMessages((prev) => [...prev, msg]);
  }, []);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const sendDebateAction = async (
    agentId: string,
    action: 'debate-argue' | 'debate-rebut',
    params: Record<string, unknown>,
  ) => {
    const requestPayload = {
      jsonrpc: '2.0',
      id: `req_${Date.now()}`,
      method: 'tasks/send',
      params: {
        message: {
          role: 'user',
          parts: [{ type: 'data', data: { action, params } }],
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

  // Speak: send action, show thinking, then bubble
  const speak = async (
    speaker: 'pro' | 'con',
    action: 'debate-argue' | 'debate-rebut',
    params: Record<string, unknown>,
    currentRound: Round,
    bubblePhase: 'argue' | 'rebut',
  ): Promise<string> => {
    const agent = AGENTS[speaker];

    setActiveSpeaker(speaker);
    setThinking(true);

    addProtocolMessage(
      createProtocolMessage({
        direction: 'sent',
        from: 'Orchestrator',
        to: agent.name,
        method: 'tasks/send',
        type: 'request',
        payload: { action, params },
        explanation: `${agent.name}に${bubblePhase === 'argue' ? '主張' : '反論'}を依頼`,
      }),
    );

    await sleep(400);
    const res = await sendDebateAction(agent.id, action, params);
    const text = extractAgentText(res) || `${bubblePhase === 'argue' ? '主張' : '反論'}を生成できませんでした`;

    addProtocolMessage(
      createProtocolMessage({
        direction: 'received',
        from: agent.name,
        to: 'Orchestrator',
        type: 'response',
        payload: res?.result || res,
        explanation: `${agent.name}が${bubblePhase === 'argue' ? '主張' : '反論'}を返しました`,
      }),
    );

    setThinking(false);

    const bubble: SpeechBubble = {
      id: `bubble_${Date.now()}_${speaker}_${bubblePhase}`,
      speaker,
      round: currentRound,
      phase: bubblePhase,
      text,
    };
    setBubbles((prev) => [...prev, bubble]);

    await sleep(600);
    setActiveSpeaker(null);
    return text;
  };

  // ─── Run debate flow ─────────────────────────

  const startDebate = async (theme: ThemeOption) => {
    setSelectedTheme(theme);
    setPhase('battle');
    setRound(1);
    setBubbles([]);
    setSummaryText('');
    setProtocolMessages([]);
    setRunning(true);
    setError(null);

    const proArgs: string[] = [];
    const conArgs: string[] = [];

    try {
      await sleep(800); // Let VS animation play

      // Round 1: 主張
      setRound(1);
      const proArg = await speak('pro', 'debate-argue', { topic: theme.topic }, 1, 'argue');
      proArgs.push(proArg);
      await sleep(300);
      const conArg = await speak('con', 'debate-argue', { topic: theme.topic }, 1, 'argue');
      conArgs.push(conArg);
      await sleep(500);

      // Round 2: 反論
      setRound(2);
      const proRebut = await speak('pro', 'debate-rebut', { topic: theme.topic, opponentArgument: conArg }, 2, 'rebut');
      proArgs.push(proRebut);
      await sleep(300);
      const conRebut = await speak('con', 'debate-rebut', { topic: theme.topic, opponentArgument: proArg }, 2, 'rebut');
      conArgs.push(conRebut);
      await sleep(500);

      // Final: まとめ
      setRound(3);
      setActiveSpeaker(null);
      setThinking(true);

      addProtocolMessage(
        createProtocolMessage({
          direction: 'sent',
          from: 'Orchestrator',
          to: 'Summary',
          type: 'event',
          payload: { action: 'generate-summary', topic: theme.topic },
          explanation: 'ディベートの総括を生成中',
        }),
      );

      const summary = await generateDebateSummary(theme.topic, proArgs, conArgs);
      setSummaryText(summary);

      addProtocolMessage(
        createProtocolMessage({
          direction: 'received',
          from: 'Summary',
          to: 'Orchestrator',
          type: 'response',
          payload: { summary },
          explanation: 'ディベートの総括が完成しました',
        }),
      );

      setThinking(false);
      setPhase('result');
    } catch (e) {
      console.error('Debate show error:', e);
      setError('ディベートの実行中にエラーが発生しました。もう一度お試しください。');
      setThinking(false);
    } finally {
      setRunning(false);
      setActiveSpeaker(null);
    }
  };

  const goToSelect = () => {
    setPhase('select');
    setSelectedTheme(null);
    setBubbles([]);
    setSummaryText('');
    setProtocolMessages([]);
    setError(null);
  };

  const retryDebate = () => {
    if (selectedTheme) startDebate(selectedTheme);
  };

  // ─── Render: Theme select ────────────────────

  if (phase === 'select') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-zinc-900 dark:text-zinc-100">
            Debate Show
          </h1>
          <p className="mt-3 text-lg text-zinc-500 dark:text-zinc-400">
            テーマを選んで、賛成くん vs 反対くんのディベートを楽しもう!
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => startDebate(theme)}
              className="group p-6 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-left transition-all duration-200 hover:scale-105 hover:border-indigo-400 hover:shadow-lg active:scale-95"
            >
              <div className="text-4xl mb-3">{theme.emoji}</div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {theme.title}
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {theme.topic}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-8 text-center">
          <a
            href="/demo/debate"
            className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline transition-colors"
          >
            技術版ディベートデモはこちら
          </a>
        </div>
      </div>
    );
  }

  // ─── Render: Battle ──────────────────────────

  if (phase === 'battle') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header: Theme + Round */}
        <div className="text-center mb-6 animate-fade-in-up">
          <p className="text-sm text-zinc-400 dark:text-zinc-500 mb-1">テーマ</p>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
            {selectedTheme?.emoji} {selectedTheme?.topic}
          </h1>
          <div className="mt-3 inline-block px-4 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold text-sm">
            {ROUND_LABELS[round]}
          </div>
        </div>

        {/* Stage: Agents + VS */}
        <div className="flex items-center justify-center gap-8 mb-8">
          <AgentFigure side="pro" active={activeSpeaker === 'pro'} />
          <VSBadge />
          <AgentFigure side="con" active={activeSpeaker === 'con'} />
        </div>

        {/* Speech bubbles area */}
        <div className="space-y-4 min-h-[200px] mb-8">
          {bubbles.map((b) => (
            <SpeechBubbleComponent key={b.id} bubble={b} />
          ))}
          {thinking && activeSpeaker && <ThinkingIndicator speaker={activeSpeaker} />}
          {thinking && !activeSpeaker && round === 3 && (
            <div className="flex justify-center">
              <div className="px-4 py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <span>まとめを生成中</span>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="inline-block w-2 h-2 rounded-full bg-indigo-500 animate-thinking-dot"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
            {error}
            <button onClick={retryDebate} className="ml-2 underline font-medium">
              再試行
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── Render: Result ──────────────────────────

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Result header */}
      <div className="text-center mb-8 animate-fade-in-up">
        <div className="text-5xl mb-3">🏆</div>
        <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
          ディベート終了!
        </h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          {selectedTheme?.emoji} {selectedTheme?.topic}
        </p>
      </div>

      {/* Summary card */}
      <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-orange-50 to-purple-50 dark:from-orange-900/10 dark:to-purple-900/10 border border-zinc-200 dark:border-zinc-700 animate-fade-in-up">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
          <span>📝</span> 総括
        </h2>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
          {summaryText}
        </p>
      </div>

      {/* Debate transcript */}
      <div className="mb-8 space-y-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">ディベート内容</h2>
        {bubbles.map((b) => (
          <SpeechBubbleComponent key={b.id} bubble={b} />
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-4 mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <button
          onClick={retryDebate}
          disabled={running}
          className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          もう一度
        </button>
        <button
          onClick={goToSelect}
          className="px-6 py-3 rounded-xl border-2 border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          テーマ選択に戻る
        </button>
      </div>

      {/* Protocol log accordion */}
      <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        <button
          onClick={() => setShowProtocol(!showProtocol)}
          className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            A2A Protocolログ ({protocolMessages.length}件)
          </span>
          <svg
            className={`w-5 h-5 text-zinc-400 transition-transform duration-200 ${showProtocol ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showProtocol && (
          <div className="mt-2">
            <ProtocolViewer
              messages={protocolMessages}
              title="A2A Protocolメッセージ"
              showExplanations={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}

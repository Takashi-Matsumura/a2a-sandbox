'use client';

import { AgentAvatar } from '@/components/agents/agent-card';

interface MessageBubbleProps {
  role: 'user' | 'agent';
  content: string;
  agentName?: string;
  agentColor?: string;
  timestamp?: string;
  data?: Record<string, unknown>;
}

export function MessageBubble({
  role,
  content,
  agentName,
  agentColor,
  timestamp,
  data,
}: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      {isUser ? (
        <div className="w-8 h-8 rounded-full bg-zinc-300 dark:bg-zinc-600 flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-semibold text-sm shrink-0">
          U
        </div>
      ) : (
        <AgentAvatar name={agentName || 'Agent'} color={agentColor} size="sm" />
      )}

      {/* Message */}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[80%]`}>
        {/* Sender name */}
        {!isUser && agentName && (
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            {agentName}
          </span>
        )}

        {/* Bubble */}
        <div
          className={`rounded-2xl px-4 py-2 ${
            isUser
              ? 'bg-indigo-600 text-white'
              : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        </div>

        {/* Data attachment */}
        {data && Object.keys(data).length > 0 && (
          <div className="mt-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-3 text-xs font-mono">
            <details>
              <summary className="cursor-pointer text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300">
                View data
              </summary>
              <pre className="mt-2 overflow-x-auto text-zinc-600 dark:text-zinc-400">
                {JSON.stringify(data, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Timestamp */}
        {timestamp && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
            {new Date(timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
}

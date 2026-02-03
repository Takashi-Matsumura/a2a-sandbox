'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

interface ProtocolViewerProps {
  messages: ProtocolMessage[];
  title?: string;
  showExplanations?: boolean;
}

export function ProtocolViewer({
  messages,
  title = 'A2A Protocolメッセージ',
  showExplanations = true,
}: ProtocolViewerProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const directionColors = {
    sent: 'border-l-indigo-500',
    received: 'border-l-green-500',
  };

  const typeColors = {
    request: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    response: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    event: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <span className="text-lg">{title}</span>
          <Badge variant="info">{messages.length}</Badge>
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? 'すべて折りたたむ' : 'すべて展開'}
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {messages.map((message) => {
            const isExpanded = showAll || expandedIds.has(message.id);

            return (
              <div
                key={message.id}
                className={`border-l-4 ${directionColors[message.direction]} pl-4 py-3 pr-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer`}
                onClick={() => toggleExpand(message.id)}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={typeColors[message.type]} size="sm">
                      {message.type}
                    </Badge>
                    {message.method && (
                      <code className="text-sm font-mono text-indigo-600 dark:text-indigo-400">
                        {message.method}
                      </code>
                    )}
                  </div>
                  <span className="text-xs text-zinc-400">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                {/* Direction */}
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  <span className="font-medium">{message.from}</span>
                  <span className="mx-2">→</span>
                  <span className="font-medium">{message.to}</span>
                </div>

                {/* Explanation */}
                {showExplanations && message.explanation && (
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 italic">
                    {message.explanation}
                  </p>
                )}

                {/* Payload */}
                {isExpanded && (
                  <div className="mt-3 rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 overflow-x-auto">
                    <pre className="text-xs font-mono text-zinc-700 dark:text-zinc-300">
                      {JSON.stringify(message.payload, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Expand indicator */}
                {!isExpanded && (
                  <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                    クリックしてpayloadを表示...
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {messages.length === 0 && (
          <div className="p-8 text-center text-zinc-400 dark:text-zinc-500">
            まだプロトコルメッセージが記録されていません
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Helper to create a protocol message
 */
export function createProtocolMessage(params: {
  direction: 'sent' | 'received';
  from: string;
  to: string;
  method?: string;
  type: 'request' | 'response' | 'event';
  payload: unknown;
  explanation?: string;
}): ProtocolMessage {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
    ...params,
  };
}

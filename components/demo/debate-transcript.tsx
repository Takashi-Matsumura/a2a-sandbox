'use client';

import { AgentAvatar } from '@/components/agents/agent-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export interface DebateEntry {
  id: string;
  agentId: string;
  agentName: string;
  agentColor: string;
  stance: 'pro' | 'con';
  phase: 'argue' | 'rebut';
  text: string;
}

interface DebateTranscriptProps {
  entries: DebateEntry[];
  title?: string;
}

export function DebateTranscript({
  entries,
  title = 'ディベート記録',
}: DebateTranscriptProps) {
  const stanceBadge = (stance: 'pro' | 'con') =>
    stance === 'pro' ? (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" size="sm">
        賛成
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" size="sm">
        反対
      </Badge>
    );

  const phaseBadge = (phase: 'argue' | 'rebut') =>
    phase === 'argue' ? (
      <Badge variant="info" size="sm">
        主張
      </Badge>
    ) : (
      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" size="sm">
        反論
      </Badge>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>{title}</span>
          <Badge variant="info">{entries.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {entries.map((entry) => (
            <div key={entry.id} className="p-4">
              {/* Agent header */}
              <div className="flex items-center gap-3 mb-3">
                <AgentAvatar
                  name={entry.agentName}
                  color={entry.agentColor}
                  size="sm"
                />
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {entry.agentName}
                </span>
                {stanceBadge(entry.stance)}
                {phaseBadge(entry.phase)}
              </div>

              {/* Argument text */}
              <div className="ml-11 p-3 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {entry.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        {entries.length === 0 && (
          <div className="p-8 text-center text-zinc-400 dark:text-zinc-500">
            ディベートが開始されるとここに記録が表示されます
          </div>
        )}
      </CardContent>
    </Card>
  );
}

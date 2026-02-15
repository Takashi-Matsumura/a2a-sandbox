'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const demos = [
  {
    id: 'schedule',
    title: '会議スケジューリング',
    description:
      '3つのAIエージェント（Alice, Bob, Carol）がA2A Protocolを使って、プライベートなスケジュールを保護しながら会議を調整する様子を体験できます。',
    href: '/demo/schedule',
    tags: ['Privacy', 'Multi-Agent', 'Scheduling'],
    color: 'bg-indigo-500',
  },
  {
    id: 'debate-show',
    title: 'ディベートショー',
    description:
      '賛成くん vs 反対くんのエンタメ版ディベート! テーマを選んで、ステージ上でのエージェント対決を楽しもう。吹き出しアニメーションで臨場感あふれる体験。',
    href: '/demo/debate-show',
    tags: ['Entertainment', 'Debate', 'Visual'],
    color: 'bg-pink-500',
  },
  {
    id: 'debate',
    title: 'エージェントディベート（技術版）',
    description:
      '賛成くんと反対くんの2エージェントがA2A Protocolを通じてディベートを行います。テーマを入力すると、主張・反論の過程をリアルタイムで可視化します。',
    href: '/demo/debate',
    tags: ['Debate', 'Agent Interaction', 'Template-based'],
    color: 'bg-orange-500',
  },
];

export default function DemoHubPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          デモ一覧
        </h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          A2A Protocolの様々な活用パターンをインタラクティブなデモで体験できます
        </p>
      </div>

      {/* Demo Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {demos.map((demo) => (
          <Card key={demo.id} className="hover:border-indigo-300 hover:shadow-md transition-all">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-3 h-3 rounded-full ${demo.color}`} />
                <CardTitle>{demo.title}</CardTitle>
              </div>
              <CardDescription>{demo.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {demo.tags.map((tag) => (
                  <Badge key={tag} variant="info" size="sm">
                    {tag}
                  </Badge>
                ))}
              </div>
              <Link href={demo.href}>
                <Button className="w-full">デモを開始</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Protocol Info */}
      <div className="mt-8 p-6 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
        <h3 className="font-semibold text-indigo-900 dark:text-indigo-300">
          A2A Protocolのデモについて
        </h3>
        <p className="mt-2 text-sm text-indigo-700 dark:text-indigo-400">
          各デモでは、エージェント間のJSON-RPC通信がリアルタイムで可視化されます。
          Agent Cardsによるエージェント探索、tasks/sendによるタスク送信、
          そしてエージェントの応答フローを実際に確認できます。
        </p>
      </div>
    </div>
  );
}

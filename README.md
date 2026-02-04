# A2A Protocol Sandbox

Google A2A (Agent-to-Agent) Protocol を学ぶためのインタラクティブなデモアプリケーションです。

## A2A Protocolとは？

A2A Protocol は、Google が提唱する **AI エージェント間の通信仕様** です。異なるエージェント同士がセキュリティとプライバシーを維持しながら、相互に通信・連携できるようにします。

### A2A Protocol の核心要素

| 要素 | 説明 |
|------|------|
| **Agent Cards** | エージェントの機能を公開するメタデータ（`/.well-known/agent.json`） |
| **Tasks** | 状態を持つやり取りの単位（JSON-RPC 2.0 ベース） |
| **Skills** | エージェントが提供する機能（例: `check-availability`, `schedule-meeting`） |
| **プライバシー制御** | 各エージェントが公開範囲を自律的に決定 |

### A2A Agent と一般的なAIチャットの違い

A2A Agent は ChatGPT のような汎用AIチャットとは異なり、**特定のタスクに特化**しています。

| 特徴 | 一般的なAIチャット（ChatGPT等） | A2A Agent |
|------|-------------------------------|-----------|
| **対応範囲** | 何でも答えようとする | 定義されたSkillsのみ |
| **予測可能性** | 応答が予測しにくい | 機能が明確に定義されている |
| **連携性** | 他システムとの連携が難しい | Agent Card で機能を公開、連携しやすい |
| **目的** | 汎用的な対話 | 特定のタスクを確実に実行 |

**なぜ範囲を限定するのか？**

1. **信頼性** - 決まった機能を確実に実行
2. **セキュリティ** - 意図しない情報漏洩を防ぐ
3. **相互運用性** - 他のシステム/エージェントが何を期待できるか明確
4. **責任の明確化** - このエージェントは何をするか/しないかが明白

**実装パターン**

```
ユーザーの入力
     ↓
┌─────────────────┐
│ 意図の解析      │ ← LLMまたはルールベース
│ (どのSkillか?)  │
└────────┬────────┘
         ↓
┌─────────────────┐
│ Skill実行       │ ← 実際のデータ処理
│ (スケジュール取得等)│
└────────┬────────┘
         ↓
    構造化された応答
```

このデモでは、各エージェントは以下の3つのSkillのみを提供します：
- `check-availability` - 空き状況の確認
- `get-busy-slots` - 予定の取得
- `schedule-meeting` - 会議の予約

### エージェント間の通信パターン

A2A Protocol は柔軟な通信パターンをサポートしています：

#### 1. Orchestrator パターン（本デモで採用）

```
        ┌─────────────┐
        │ Orchestrator│
        └──────┬──────┘
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
┌───────┐  ┌───────┐  ┌───────┐
│ Alice │  │  Bob  │  │ Carol │
└───────┘  └───────┘  └───────┘
```

中央の Orchestrator がエージェントを調整し、情報を集約します。複数エージェントの結果を統合する必要があるユースケース（会議調整など）に適しています。

#### 2. 直接通信パターン

```
┌───────┐         ┌───────┐
│Agent A│ ◄─────► │Agent B│
└───────┘         └───────┘
```

エージェント同士が直接タスクを送受信します。

#### 3. 連鎖パターン

```
┌───────┐     ┌───────┐     ┌───────┐
│Agent A│ ──► │Agent B│ ──► │Agent C│
└───────┘     └───────┘     └───────┘
```

処理を順番に委譲していきます。

**重要**: A2A Protocol は通信仕様であり、Orchestrator は必須ではありません。ユースケースに応じて適切なパターンを選択できます。

## このアプリでできること

### 1. 会議スケジューリングデモ

3つのAIエージェント（Alice, Bob, Carol）が協力して会議を調整する様子を観察できます。

- **エージェント探索**: Agent Cards による機能の発見
- **プライバシー保護**: 予定の詳細を隠しながら空き状況のみを共有
- **協調動作**: 共通の空き時間を見つけて会議を予約

### 2. エージェントとのチャット

個別のエージェントと対話して、その機能を試すことができます。

### 3. Agent Card の確認

A2A Protocol 仕様に基づくエージェントのメタデータを確認できます。

## 学習の進め方

1. **デモページ** から始めて、エージェント間の通信フローを観察
2. **A2A Protocol メッセージ** パネルで JSON-RPC のリクエスト/レスポンスを確認
3. **エージェントページ** で個別のエージェントとチャット
4. **Agent Card タブ** でメタデータ仕様を理解

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **データベース**: SQLite (better-sqlite3)
- **スタイリング**: Tailwind CSS
- **プロトコル**: JSON-RPC 2.0

## セットアップ

### 必要条件

- Node.js 18 以上
- npm または yarn

### インストール

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## プロジェクト構造

```
a2a-sandbox/
├── app/                    # Next.js App Router
│   ├── api/               # API エンドポイント
│   │   ├── agents/        # エージェント関連 API
│   │   ├── tasks/         # タスク管理 API
│   │   └── db/            # データベース初期化
│   ├── agents/            # エージェントページ
│   ├── demo/              # デモページ
│   └── .well-known/       # Agent Cards エンドポイント
├── components/            # React コンポーネント
│   ├── agents/            # エージェント関連
│   ├── chat/              # チャット UI
│   ├── demo/              # デモ用コンポーネント
│   └── schedule/          # スケジュール表示
├── lib/                   # ライブラリ・ユーティリティ
│   ├── a2a/               # A2A Protocol 実装
│   ├── agents/            # エージェント定義
│   ├── db/                # データベース操作
│   └── privacy/           # プライバシーフィルター
└── data/                  # SQLite データベースファイル
```

## A2A Protocol 仕様

### Agent Card の例

```json
{
  "name": "Alice's Assistant",
  "url": "/api/agents/alice",
  "capabilities": {
    "streaming": false,
    "pushNotifications": false
  },
  "skills": [
    {
      "id": "check-availability",
      "name": "Check Availability",
      "description": "Check if the user is available at a specific time"
    }
  ],
  "protocolVersions": ["1.0"]
}
```

### タスク送信リクエストの例

```json
{
  "jsonrpc": "2.0",
  "id": "req_123",
  "method": "tasks/send",
  "params": {
    "message": {
      "role": "user",
      "parts": [
        { "type": "text", "text": "What times are you busy today?" }
      ]
    }
  }
}
```

## 参考リンク

- [Google A2A Protocol 公式ドキュメント](https://github.com/google/A2A)
- [JSON-RPC 2.0 仕様](https://www.jsonrpc.org/specification)

## ライセンス

MIT

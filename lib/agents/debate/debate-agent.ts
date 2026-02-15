import type {
  Task,
  Message,
  ExecutionContext,
  AgentResponse,
  Part,
} from '../../a2a/types';
import {
  extractTextContent,
  extractDataContent,
} from '../../a2a/message-handler';
import { BaseAgent, type AgentConfig } from '../base-agent';
import { callLLM, isLLMAvailable } from '../../llm/client';
import { generateArgument } from './templates';

type Stance = 'pro' | 'con';

export interface DebateAgentConfig extends AgentConfig {
  stance: Stance;
}

const STANCE_LABEL: Record<Stance, string> = {
  pro: '賛成',
  con: '反対',
};

type Persona = 'elementary' | 'highschool' | 'university' | 'adult' | 'executive' | 'researcher';
type Volume = 'concise' | 'unlimited';

const PERSONA_PROMPT: Record<Persona, string> = {
  elementary: `あなたは小学生です。小学生として自然な話し方で話してください。
【最重要ルール — 必ず守ること】
- 小学生が実際に使う話し言葉で書くこと。「〜だよ！」「〜だと思うな」「〜じゃないかな」「だって〜だもん」「すごく」「めっちゃ」「やっぱり」などを使う
- 難しい漢字は使わない。小学校で習う漢字だけ使い、それ以外はひらがなで書く
- 「倫理的」「経済的」「観点」「懸念」「促進」などの大人の言葉は絶対に使わない
- 自分の体験や気持ちをもとに話す。「ぼく/わたしは〜だと思う」「友だちも〜って言ってた」
- 理由は「だって」「なぜかっていうと」でシンプルに説明する
- 文章は短く。一文を長くしない
【話し方の例】
「ぼくは宿題はなくていいと思うな！だって、学校でもうべんきょうしてるのに、おうちに帰ってからもべんきょうするのはたいへんだもん。それに、友だちとあそぶ時間がなくなっちゃうし。」`,
  highschool: `あなたは中高生です。10代の学生として自然な話し方で話してください。
【重要ルール】
- 若者らしいカジュアルな口調で。「〜じゃん」「〜って感じ」「マジで」「ぶっちゃけ」「〜だし」なども適度に使ってOK
- 学校生活・友人関係・SNS・部活・受験など身近な経験を例に出す
- 難しすぎる専門用語は避けるが、授業で習った言葉は使える
- 「正直〜と思う」「実際〜だし」のような率直な物言い
【話し方の例】
「正直、宿題って意味あるのかなって思う。授業ちゃんと聞いてたら分かるし、家では自分の好きなこと勉強したほうがよくない？ まあ、復習になるのは分かるけどさ。」`,
  university: `あなたは大学生です。学問を学んでいる若者の視点で話してください。
【重要ルール】
- 論理的だが硬すぎない文体。「〜と考えられます」「〜ではないでしょうか」
- 授業やゼミで学んだ知識を引用しつつ、自分の意見も述べる
- 「先行研究では」「〜という議論がある」のような学術的な言い回しも交える
- 社会問題への関心を示しつつ、まだ模索中という謙虚さも見せる`,
  adult: `あなたは社会人です。実務経験のある大人として話してください。
【重要ルール】
- バランスの取れた実践的な視点で議論する
- 仕事や生活の実体験に基づいた具体例を使う
- 丁寧だが堅すぎない文体。「〜と考えます」「〜が重要です」`,
  executive: `あなたは企業の経営者です。経営者の視座で話してください。
【重要ルール】
- ROI・市場インパクト・組織への影響・中長期戦略の観点を重視
- 「事業としては」「経営判断として」「投資対効果を考えると」などの言い回し
- 数字・コスト・スケーラビリティを意識した議論
- 決断力のある物言い。「〜すべきです」「〜が不可欠です」`,
  researcher: `あなたは研究者です。学術的な厳密さで話してください。
【重要ルール】
- エビデンスとデータに基づいた論証。「〜の研究によれば」「統計的に見ると」
- 学術用語を適切に使用し、因果関係と相関関係を区別する
- 反証可能性や限界にも言及する。「ただし〜という制約がある」
- 客観的で慎重な文体。「〜と示唆される」「〜の可能性が高い」`,
};

const VOLUME_PROMPT: Record<Volume, string> = {
  concise: '100〜200文字程度で簡潔にまとめてください。要点のみを述べてください。',
  unlimited: '200〜400文字程度でまとめてください。',
};

/**
 * Build a system prompt for the debate agent
 */
const PERSONA_LABEL: Record<Persona, string> = {
  elementary: '小学生',
  highschool: '中高生',
  university: '大学生',
  adult: '社会人',
  executive: '経営者',
  researcher: '研究者',
};

function buildDebateSystemPrompt(
  name: string,
  stance: Stance,
  persona: Persona = 'adult',
  volume: Volume = 'unlimited',
): string {
  const stanceLabel = STANCE_LABEL[stance];
  const personaLabel = PERSONA_LABEL[persona];
  return `${PERSONA_PROMPT[persona]}

あなたは「${name}」という名前の${personaLabel}のディベーターです。
与えられたテーマに対して常に「${stanceLabel}」の立場から議論してください。

基本ルール:
- 必ず日本語で回答してください
- 必ず「${stanceLabel}」の立場を一貫して守ってください
- ${personaLabel}らしい言葉遣い・考え方を最優先で守ってください。上記のキャラクター設定に従った口調で話すことが最も重要です
- ${VOLUME_PROMPT[volume]}
- 相手への敬意を保ちつつ、自分の立場を明確に主張してください`;
}

/**
 * Base class for debate agents
 * Uses LLM for argument generation, with template fallback
 */
export class DebateAgent extends BaseAgent {
  protected stance: Stance;

  constructor(config: DebateAgentConfig) {
    super({
      ...config,
      skills: ['debate-argue', 'debate-rebut'],
    });
    this.stance = config.stance;
  }

  /**
   * Override execute to handle debate-specific actions
   */
  async execute(
    task: Task,
    message: Message,
    context: ExecutionContext
  ): Promise<AgentResponse> {
    try {
      const dataContent = extractDataContent(message);

      if (dataContent.length > 0) {
        const data = dataContent[0];
        const action = data.action as string;
        const params = data.params as Record<string, unknown> | undefined;

        if (action === 'debate-argue' || action === 'debate-rebut') {
          return await this.handleDebateAction(action, params);
        }
      }

      // Fallback: greeting
      const textContent = extractTextContent(message);
      if (textContent) {
        return this.createSuccessResponse(
          `こんにちは！${this.config.name}です。「${STANCE_LABEL[this.stance]}」の立場でディベートに参加します。テーマを設定してください！`
        );
      }

      return this.createSuccessResponse(
        `${this.config.name}です。ディベートの準備ができています！`
      );
    } catch (error) {
      console.error(`[${this.config.name}] Error:`, error);
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Handle debate-specific actions using LLM (with template fallback)
   */
  private async handleDebateAction(
    action: string,
    params?: Record<string, unknown>
  ): Promise<AgentResponse> {
    const topic = params?.topic as string;
    if (!topic) {
      return this.createErrorResponse('トピックが指定されていません');
    }

    const phase = action === 'debate-argue' ? 'argue' : 'rebut';
    const opponentArgument = params?.opponentArgument as string | undefined;
    const persona = (params?.persona as Persona) || 'adult';
    const volume = (params?.volume as Volume) || 'unlimited';

    // Try LLM first, fall back to templates
    let text: string;
    let usedLLM = false;

    const llmAvailable = await isLLMAvailable();

    if (llmAvailable) {
      try {
        text = await this.generateWithLLM(topic, phase, opponentArgument, persona, volume);
        usedLLM = true;
      } catch (error) {
        console.warn(`[${this.config.name}] LLM failed, using template fallback:`, error);
        const result = generateArgument(topic, this.stance, phase, opponentArgument);
        text = result.text;
      }
    } else {
      const result = generateArgument(topic, this.stance, phase, opponentArgument);
      text = result.text;
    }

    const parts: Part[] = [
      { type: 'text', text },
      {
        type: 'data',
        data: {
          skill: action,
          stance: this.stance,
          phase,
          topic,
          usedLLM,
        },
      },
    ];

    return {
      status: {
        state: 'completed',
        message: { role: 'agent', parts },
      },
    };
  }

  /**
   * Generate argument text using LLM
   */
  private async generateWithLLM(
    topic: string,
    phase: 'argue' | 'rebut',
    opponentArgument?: string,
    persona: Persona = 'adult',
    volume: Volume = 'unlimited',
  ): Promise<string> {
    const systemPrompt = buildDebateSystemPrompt(this.config.name, this.stance, persona, volume);
    const stanceLabel = STANCE_LABEL[this.stance];

    const personaLabel = PERSONA_LABEL[persona];
    const personaReminder = persona !== 'adult'
      ? `\n\n【重要】${personaLabel}の口調・語彙・考え方で回答してください。`
      : '';

    let userPrompt: string;

    if (phase === 'argue') {
      userPrompt = `テーマ: 「${topic}」\n\nこのテーマについて、${stanceLabel}の立場から主張を展開してください。${personaReminder}`;
    } else {
      userPrompt = `テーマ: 「${topic}」\n\n相手（${this.stance === 'pro' ? '反対' : '賛成'}派）の主張:\n${opponentArgument}\n\nこの相手の主張に対して、${stanceLabel}の立場から反論してください。${personaReminder}`;
    }

    const response = await callLLM({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      maxTokens: volume === 'concise' ? 250 : 500,
    });

    return response;
  }
}

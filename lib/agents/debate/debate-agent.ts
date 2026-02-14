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

/**
 * Build a system prompt for the debate agent
 */
function buildDebateSystemPrompt(name: string, stance: Stance): string {
  const stanceLabel = STANCE_LABEL[stance];
  return `あなたは「${name}」という名前のディベートエージェントです。
あなたの役割は、与えられたテーマに対して常に「${stanceLabel}」の立場から議論することです。

ルール:
- 必ず日本語で回答してください
- 必ず「${stanceLabel}」の立場を一貫して守ってください
- 論理的で説得力のある議論を展開してください
- 倫理的、実用的、経済的、革新的など多角的な観点を活用してください
- 200〜400文字程度で簡潔にまとめてください
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

    // Try LLM first, fall back to templates
    let text: string;
    let usedLLM = false;

    const llmAvailable = await isLLMAvailable();

    if (llmAvailable) {
      try {
        text = await this.generateWithLLM(topic, phase, opponentArgument);
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
    opponentArgument?: string
  ): Promise<string> {
    const systemPrompt = buildDebateSystemPrompt(this.config.name, this.stance);
    const stanceLabel = STANCE_LABEL[this.stance];

    let userPrompt: string;

    if (phase === 'argue') {
      userPrompt = `テーマ: 「${topic}」\n\nこのテーマについて、${stanceLabel}の立場から主張を展開してください。`;
    } else {
      userPrompt = `テーマ: 「${topic}」\n\n相手（${this.stance === 'pro' ? '反対' : '賛成'}派）の主張:\n${opponentArgument}\n\nこの相手の主張に対して、${stanceLabel}の立場から反論してください。`;
    }

    const response = await callLLM({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      maxTokens: 500,
    });

    return response;
  }
}

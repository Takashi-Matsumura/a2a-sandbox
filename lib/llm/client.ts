import type { AgentSkill } from '../a2a/types';

const LLM_BASE_URL = process.env.LLM_BASE_URL || 'http://localhost:8080';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequestParams {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

/**
 * Call the LLM API (llama.cpp server with OpenAI-compatible API)
 */
export async function callLLM(params: LLMRequestParams): Promise<string> {
  try {
    const response = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: params.messages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 500,
        stop: params.stop,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('LLM call failed:', error);
    // Return a fallback message instead of throwing
    return "I'm sorry, I couldn't process that request right now. Please try again or ask a simpler question.";
  }
}

/**
 * Check if LLM server is available
 */
export async function isLLMAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${LLM_BASE_URL}/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Create a system prompt for an agent
 */
export function createAgentSystemPrompt(params: {
  name: string;
  personality?: string;
  skills: AgentSkill[];
}): string {
  const skillDescriptions = params.skills
    .map((skill) => `- ${skill.name}: ${skill.description}`)
    .join('\n');

  return `You are a personal assistant for ${params.name}.

${params.personality || ''}

You have the following capabilities:
${skillDescriptions}

When users ask about availability or scheduling:
1. Always be clear about which dates and times you're referring to
2. Use 24-hour time format (e.g., 14:00 instead of 2 PM)
3. Respect privacy - never reveal details of private events, just say "busy"
4. Be helpful in finding alternative times if the requested time is not available

Respond in a friendly, professional manner. Keep responses concise but informative.`;
}

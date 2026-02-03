import { NextResponse } from 'next/server';
import { callLLM, isLLMAvailable, type ChatMessage } from '@/lib/llm/client';

/**
 * GET /api/llm
 * Check if LLM server is available
 */
export async function GET() {
  const available = await isLLMAvailable();
  return NextResponse.json({
    available,
    endpoint: process.env.LLM_BASE_URL || 'http://localhost:8080',
  });
}

/**
 * POST /api/llm
 * Proxy to LLM server for chat completions
 * Body:
 *   - messages: array of ChatMessage
 *   - temperature: optional
 *   - maxTokens: optional
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, temperature, maxTokens } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Missing or invalid messages array' },
        { status: 400 }
      );
    }

    const response = await callLLM({
      messages: messages as ChatMessage[],
      temperature,
      maxTokens,
    });

    return NextResponse.json({
      success: true,
      content: response,
    });
  } catch (error) {
    console.error('Error calling LLM:', error);
    return NextResponse.json(
      { error: 'Failed to call LLM' },
      { status: 500 }
    );
  }
}

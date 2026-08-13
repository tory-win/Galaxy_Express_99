import { readFileSync } from 'node:fs';

import { config } from './config.js';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiResult {
  reply: string;
  usage: { input: number; output: number; cacheRead: number };
  truncated: boolean;
}

export class AiUpstreamError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AiUpstreamError';
  }
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function apiKeyFromYaml(contents: string): string | undefined {
  const block = /(?:^|\n)api-keys:\s*\n((?:\s*-\s*\S+\s*\n?)+)/.exec(contents);
  const value = block?.[1] == null ? undefined : /-\s*(\S+)/.exec(block[1])?.[1];
  const key = value == null ? '' : unquote(value);
  return key || undefined;
}

function apiKey(): string {
  if (config.ai.apiKey) return config.ai.apiKey;
  if (!config.ai.apiKeyFile) throw new AiUpstreamError(503, 'AI 키 파일이 설정되지 않았습니다.');
  try {
    const key = apiKeyFromYaml(readFileSync(config.ai.apiKeyFile, 'utf8'));
    if (key) return key;
  } catch {
    throw new AiUpstreamError(503, 'AI 키 파일을 읽지 못했습니다.');
  }
  throw new AiUpstreamError(503, 'AI 프록시 키를 찾지 못했습니다.');
}

export function buildAiRequest(context: string, messages: ChatMessage[]): Record<string, unknown> {
  return {
    model: config.ai.model,
    store: false,
    instructions:
      '당신은 Galaxy Express 99 물류 운영 코파일럿입니다. 제공된 운영 스냅샷만 사실로 취급하고, ' +
      '추측은 추측이라고 표시하세요. 실행 권한이 없는 조치는 실행했다고 말하지 마세요. ' +
      '한국어 해요체로 핵심 판단, 근거, 다음 행동을 짧고 구체적으로 답하세요. 개인정보를 요청하지 마세요.',
    input: [
      { role: 'user', content: `현재 개발 샘플 운영 스냅샷:\n${context}` },
      { role: 'assistant', content: '운영 스냅샷을 확인했어요. 질문을 알려주세요.' },
      ...messages,
    ],
    reasoning: { effort: config.ai.effort },
    max_output_tokens: config.ai.maxOutputTokens,
  };
}

interface ResponsePayload {
  status?: unknown;
  incomplete_details?: { reason?: unknown } | null;
  output?: Array<{ type?: unknown; content?: Array<{ type?: unknown; text?: unknown }> }>;
  usage?: {
    input_tokens?: unknown;
    output_tokens?: unknown;
    input_tokens_details?: { cached_tokens?: unknown } | null;
  } | null;
  error?: { message?: unknown } | null;
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function sanitizeAiReply(value: string): string {
  return value
    .replace(/\[([^\]]+)]\(https?:\/\/[^)]+\)/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .trim();
}

export function parseAiResponse(payload: ResponsePayload): AiResult {
  if (payload.error) {
    throw new AiUpstreamError(
      502,
      typeof payload.error.message === 'string' ? payload.error.message : 'AI 호출이 실패했습니다.',
    );
  }
  const text: string[] = [];
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && typeof content.text === 'string') text.push(content.text);
    }
  }
  const reply = sanitizeAiReply(text.join(''));
  if (!reply) throw new AiUpstreamError(502, 'AI가 빈 응답을 반환했습니다.');
  return {
    reply,
    usage: {
      input: count(payload.usage?.input_tokens),
      output: count(payload.usage?.output_tokens),
      cacheRead: count(payload.usage?.input_tokens_details?.cached_tokens),
    },
    truncated:
      payload.status === 'incomplete' && payload.incomplete_details?.reason === 'max_output_tokens',
  };
}

export async function askAi(context: string, messages: ChatMessage[]): Promise<AiResult> {
  const response = await fetch(`${config.ai.proxyUrl}/v1/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey()}` },
    body: JSON.stringify(buildAiRequest(context, messages)),
    signal: AbortSignal.timeout(config.ai.timeoutMs),
  });
  const raw = await response.text();
  let payload: ResponsePayload;
  try {
    payload = JSON.parse(raw) as ResponsePayload;
  } catch {
    throw new AiUpstreamError(response.status || 502, 'AI 프록시가 JSON이 아닌 응답을 보냈습니다.');
  }
  if (!response.ok) {
    throw new AiUpstreamError(
      response.status,
      typeof payload.error?.message === 'string'
        ? payload.error.message
        : `AI 프록시 오류 (${response.status})`,
    );
  }
  return parseAiResponse(payload);
}

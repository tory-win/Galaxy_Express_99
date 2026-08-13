import { describe, expect, it } from 'vitest';

import { apiKeyFromYaml, buildAiRequest, parseAiResponse, sanitizeAiReply } from '../src/ai.js';

describe('AI proxy contract', () => {
  it('reads only the first configured proxy key', () => {
    expect(apiKeyFromYaml('port: 8318\napi-keys:\n  - "first-key"\n  - second-key\n')).toBe(
      'first-key',
    );
  });

  it('uses Responses API privacy and reasoning settings', () => {
    const request = buildAiRequest('{"alerts":[]}', [{ role: 'user', content: '지연은?' }]);
    expect(request.store).toBe(false);
    expect(request.model).toBeTruthy();
    expect(request.reasoning).toEqual({ effort: 'low' });
  });

  it('extracts output text and usage', () => {
    expect(
      parseAiResponse({
        status: 'completed',
        output: [{ type: 'message', content: [{ type: 'output_text', text: '정상이에요.' }] }],
        usage: { input_tokens: 10, output_tokens: 4, input_tokens_details: { cached_tokens: 2 } },
      }),
    ).toMatchObject({ reply: '정상이에요.', usage: { input: 10, output: 4, cacheRead: 2 } });
  });

  it('normalizes markdown into plain product chat text', () => {
    expect(sanitizeAiReply('**긴급:** `BSN-01`을 확인하세요.')).toBe('긴급: BSN-01을 확인하세요.');
  });
});

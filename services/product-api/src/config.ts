import { readFileSync } from 'node:fs';

function integer(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function passwordFromFile(): string {
  const file = process.env.PGPASSWORD_FILE?.trim();
  return file ? readFileSync(file, 'utf8').trim() : (process.env.PGPASSWORD ?? '');
}

const efforts = ['none', 'low', 'medium', 'high', 'xhigh', 'max'] as const;
type Effort = (typeof efforts)[number];
const effort = (process.env.AI_REASONING_EFFORT ?? 'low') as Effort;
if (!efforts.includes(effort)) throw new Error('AI_REASONING_EFFORT is invalid');

export const config = {
  port: integer('PORT', 8_320, 1, 65_535),
  trustProxy: process.env.TRUST_PROXY ?? 'loopback',
  ai: {
    proxyUrl: (process.env.AI_PROXY_URL ?? 'http://127.0.0.1:8318').replace(/\/$/, ''),
    apiKey: process.env.AI_API_KEY?.trim() ?? '',
    apiKeyFile: process.env.AI_API_KEY_FILE?.trim() ?? '',
    model: process.env.AI_MODEL ?? 'gpt-5.6-terra',
    effort,
    maxOutputTokens: integer('AI_MAX_OUTPUT_TOKENS', 900, 128, 8_000),
    dailyCap: integer('AI_DAILY_CAP', 1_000, 1, 1_000_000),
    rateLimitPerMinute: integer('AI_RATE_LIMIT_PER_MINUTE', 12, 1, 1_000),
    timeoutMs: integer('AI_TIMEOUT_MS', 22_000, 1_000, 60_000),
  },
  database: {
    host: process.env.PGHOST ?? '127.0.0.1',
    port: integer('PGPORT', 5_432, 1, 65_535),
    user: process.env.PGUSER ?? 'galaxy',
    database: process.env.PGDATABASE ?? 'galaxy_express_99',
    password: passwordFromFile(),
  },
} as const;

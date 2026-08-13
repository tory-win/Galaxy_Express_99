import express, { type NextFunction, type Request, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import pg from 'pg';

import { AiUpstreamError, askAi, type ChatMessage } from './ai.js';
import { config } from './config.js';

const { Pool } = pg;
const pool = new Pool({
  ...config.database,
  max: 10,
  application_name: 'galaxy-product-api',
});

const app = express();
const trustProxy = /^\d+$/.test(config.trustProxy)
  ? Number.parseInt(config.trustProxy, 10)
  : config.trustProxy;
app.set('trust proxy', trustProxy);
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '64kb' }));

const aiLimiter = rateLimit({
  windowMs: 60_000,
  limit: config.ai.rateLimitPerMinute,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'AI_RATE_LIMITED' },
});

async function operationalSnapshot() {
  const [facilities, shipments, alerts] = await Promise.all([
    pool.query(
      `SELECT code, name, facility_type AS "facilityType", region,
              utilization::float8, status, updated_at AS "updatedAt"
         FROM logistics_facilities ORDER BY code`,
    ),
    pool.query(
      `SELECT tracking_code AS "trackingCode", origin_code AS "originCode",
              destination_code AS "destinationCode", cargo_type AS "cargoType",
              status, progress, eta, delay_minutes AS "delayMinutes", updated_at AS "updatedAt"
         FROM logistics_shipments ORDER BY eta`,
    ),
    pool.query(
      `SELECT id, severity, title, description, source, status, created_at AS "createdAt"
         FROM logistics_alerts WHERE status = 'open'
         ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END, created_at DESC`,
    ),
  ]);
  const delayed = shipments.rows.filter((shipment) => shipment.status === 'delayed').length;
  const averageUtilization =
    facilities.rows.length === 0
      ? 0
      : facilities.rows.reduce((sum, facility) => sum + Number(facility.utilization), 0) /
        facilities.rows.length;
  return {
    sampleData: true,
    generatedAt: new Date().toISOString(),
    metrics: {
      activeShipments: shipments.rows.filter((shipment) => shipment.status !== 'delivered').length,
      delayedShipments: delayed,
      averageUtilization: Math.round(averageUtilization * 10) / 10,
      openAlerts: alerts.rows.length,
    },
    facilities: facilities.rows,
    shipments: shipments.rows,
    alerts: alerts.rows,
  };
}

async function reserveDailyAiRequest(): Promise<boolean> {
  const result = await pool.query(
    `INSERT INTO ai_usage_daily (usage_date, request_count)
     VALUES (CURRENT_DATE, 1)
     ON CONFLICT (usage_date) DO UPDATE
       SET request_count = ai_usage_daily.request_count + 1, updated_at = now()
       WHERE ai_usage_daily.request_count < $1
     RETURNING request_count`,
    [config.ai.dailyCap],
  );
  return result.rowCount === 1;
}

async function recordUsage(input: number, output: number): Promise<void> {
  await pool.query(
    `UPDATE ai_usage_daily
        SET input_tokens = input_tokens + $1,
            output_tokens = output_tokens + $2,
            updated_at = now()
      WHERE usage_date = CURRENT_DATE`,
    [input, output],
  );
}

app.get('/health', async (_request, response) => {
  let database = false;
  try {
    await pool.query('SELECT 1');
    database = true;
  } catch {
    database = false;
  }
  response.status(database ? 200 : 503).json({
    ok: database,
    service: 'galaxy-product-api',
    database: database ? 'ready' : 'unavailable',
    ai: {
      provider: 'openai-responses-via-cli-proxy',
      model: config.ai.model,
      effort: config.ai.effort,
      store: false,
      configured: Boolean(config.ai.apiKey || config.ai.apiKeyFile),
    },
  });
});

app.get('/session', (_request, response) => {
  response.json({
    name: 'DEV',
    csrf: '',
    expiresAt: 0,
    mode: 'standalone-development',
  });
});

app.get('/operations/summary', async (_request, response) => {
  response.json(await operationalSnapshot());
});

app.post('/ai/chat', aiLimiter, async (request, response) => {
  const body = request.body as { messages?: unknown };
  if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 20) {
    response.status(400).json({ error: 'AI_MESSAGES_INVALID' });
    return;
  }
  const messages: ChatMessage[] = [];
  let inputChars = 0;
  for (const raw of body.messages) {
    if (
      typeof raw !== 'object' ||
      raw == null ||
      !('role' in raw) ||
      !('content' in raw) ||
      (raw.role !== 'user' && raw.role !== 'assistant') ||
      typeof raw.content !== 'string'
    ) {
      response.status(400).json({ error: 'AI_MESSAGES_INVALID' });
      return;
    }
    const content = raw.content.trim();
    if (!content || content.length > 4_000) {
      response.status(400).json({ error: 'AI_MESSAGE_LENGTH_INVALID' });
      return;
    }
    inputChars += content.length;
    messages.push({ role: raw.role, content });
  }
  if (inputChars > 12_000 || messages.at(-1)?.role !== 'user') {
    response.status(400).json({ error: 'AI_MESSAGES_INVALID' });
    return;
  }
  if (!(await reserveDailyAiRequest())) {
    response.status(503).json({ error: 'AI_DAILY_CAP_REACHED' });
    return;
  }
  const snapshot = await operationalSnapshot();
  const context = JSON.stringify(snapshot);
  try {
    const result = await askAi(context, messages);
    await recordUsage(result.usage.input, result.usage.output);
    response.json({ reply: result.reply, truncated: result.truncated });
  } catch (error) {
    const status = error instanceof AiUpstreamError ? Math.min(Math.max(error.status, 400), 599) : 502;
    console.error('[product-api] AI call failed', error instanceof Error ? error.message : error);
    response.status(status).json({
      error: 'AI_UNAVAILABLE',
      fallback: 'AI 연결이 잠시 불안정해요. 운영 현황과 경보 기능은 계속 사용할 수 있습니다.',
    });
  }
});

app.use((_request, response) => response.status(404).json({ error: 'NOT_FOUND' }));
app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  console.error('[product-api] request failed', error instanceof Error ? error.message : error);
  if (!response.headersSent) response.status(500).json({ error: 'INTERNAL_ERROR' });
});

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`[product-api] listening on 0.0.0.0:${config.port}`);
});

async function shutdown(): Promise<void> {
  await pool.end();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5_000).unref();
}

process.once('SIGTERM', () => void shutdown());
process.once('SIGINT', () => void shutdown());

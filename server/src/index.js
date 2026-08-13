import express from 'express'
import { randomUUID } from 'node:crypto'
import { closeDatabase, databaseHealth, pool } from './db.js'
import { buildProposals, extractConditionsFromText, validateFreightRequest } from './demo-engine.js'
import { extractWithAi } from './ai-client.js'
import { formatDepartureDate, formatTeu } from './presentation.js'
import { getPublicDataStatus } from './public-data.js'

const app = express()
const port = Number(process.env.PORT || 8320)
const aiRateLimit = Number(process.env.AI_RATE_LIMIT_PER_MINUTE || 12)
const aiRateWindows = new Map()

app.disable('x-powered-by')
app.use(express.json({ limit: '256kb' }))
app.use((request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  if (request.method === 'OPTIONS') return response.sendStatus(204)
  next()
})

function toRequest(row) {
  const payload = row.payload ?? {}
  const departureDate = formatDepartureDate(row.departure_date)
  const statusLabels = {
    analyzing: 'AI 분석 중',
    proposal_ready: '역제안 도착 · 2건',
    pooling: '함께 보내기 · 15/18TEU',
    review_submitted: '검토 요청 보냄',
    closed: '종료',
  }
  return {
    ...payload,
    id: row.id,
    origin: payload.originLabel ?? row.origin,
    destination: payload.destinationLabel ?? row.destination,
    quantity: payload.quantity ?? `${row.container_size} × ${row.container_count} · ${formatTeu(row.teu)}TEU`,
    departureDate: payload.departureLabel ?? departureDate,
    status: row.status,
    statusLabel: payload.statusLabel ?? statusLabels[row.status] ?? '상태 확인 중',
    updatedAt: payload.updatedAt ?? '방금 전',
  }
}

app.get('/health', async (_request, response) => {
  const database = await databaseHealth()
  response.status(database.ok ? 200 : 503).json({
    ok: database.ok,
    service: 'railpool-api',
    database,
    ai: { enabled: process.env.AI_ENABLED === 'true', model: process.env.AI_MODEL || 'gpt-5.6-sol' },
    publicData: { configured: Boolean(process.env.KORAIL_API_KEY) },
  })
})

app.get('/api/v1/sources', async (_request, response, next) => {
  try {
    response.json(await getPublicDataStatus())
  } catch (error) {
    next(error)
  }
})

app.get('/api/v1/requests', async (_request, response, next) => {
  try {
    const result = await pool.query('select * from freight_requests order by updated_at desc limit 20')
    response.json({ requests: result.rows.map(toRequest) })
  } catch (error) {
    next(error)
  }
})

app.post('/api/v1/extract', async (request, response) => {
  const now = Date.now()
  const clientKey = request.ip || request.socket.remoteAddress || 'unknown'
  const currentWindow = aiRateWindows.get(clientKey)
  const windowState = !currentWindow || now - currentWindow.startedAt >= 60_000
    ? { startedAt: now, count: 0 }
    : currentWindow
  windowState.count += 1
  aiRateWindows.set(clientKey, windowState)
  if (windowState.count > aiRateLimit) {
    response.setHeader('Retry-After', '60')
    return response.status(429).json({ message: 'AI 분석 요청이 많습니다. 잠시 후 다시 시도해 주세요.' })
  }

  const text = String(request.body?.text ?? '').trim()
  if (!text) return response.status(400).json({ message: '붙여넣을 문서 내용이 필요합니다.' })
  if (text.length > 30_000) return response.status(413).json({ message: '문서는 30,000자 이하로 입력해 주세요.' })

  const rulesResult = extractConditionsFromText(text)
  const aiResult = await extractWithAi(text)
  if (!aiResult) return response.json(rulesResult)

  response.json({
    ...rulesResult,
    fields: { ...rulesResult.fields, ...aiResult },
    source: 'ai',
  })
})

app.post('/api/v1/requests', async (request, response, next) => {
  const validation = validateFreightRequest(request.body ?? {})
  if (!validation.ok) return response.status(validation.hazardous ? 422 : 400).json({ message: validation.message, hazardous: Boolean(validation.hazardous) })

  try {
    const sequence = await pool.query("select nextval('request_number_seq') as value")
    const id = `R-2026-${String(sequence.rows[0].value).padStart(4, '0')}`
    const input = request.body
    const result = await pool.query(
      `insert into freight_requests
        (id, origin, destination, container_size, container_count, teu, departure_date, deadline_at, hazardous, road_cost, status, payload)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'analyzing',$11::jsonb)
       returning *`,
      [id, input.origin, input.destination, input.containerSize, input.containerCount, input.teu, input.departureDate, input.deadline, false, input.roadCost ?? null, JSON.stringify(input)],
    )
    response.status(201).json({ request: toRequest(result.rows[0]) })
  } catch (error) {
    next(error)
  }
})

app.post('/api/v1/requests/:id/analyze', async (request, response, next) => {
  try {
    const found = await pool.query('select * from freight_requests where id = $1', [request.params.id])
    if (!found.rowCount) return response.status(404).json({ message: '운송 요청을 찾지 못했습니다.' })
    const freightRequest = found.rows[0]
    const proposals = buildProposals({ ...freightRequest.payload, roadCost: freightRequest.road_cost })

    const client = await pool.connect()
    try {
      await client.query('begin')
      for (const proposal of proposals) {
        await client.query(
          `insert into proposals (id, request_id, type, rank, payload)
           values ($1,$2,$3,$4,$5::jsonb)
           on conflict (id) do update set payload = excluded.payload, updated_at = now()`,
          [proposal.id, freightRequest.id, proposal.type, proposal.recommended ? 1 : 2, JSON.stringify(proposal)],
        )
      }
      await client.query("update freight_requests set status = 'proposal_ready', updated_at = now() where id = $1", [freightRequest.id])
      await client.query('commit')
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }

    const sourceStatus = process.env.KORAIL_API_KEY
      ? await getPublicDataStatus()
      : { configured: false, mode: 'demo_snapshot' }
    response.json({ request: toRequest({ ...freightRequest, status: 'proposal_ready' }), proposals, sources: sourceStatus })
  } catch (error) {
    next(error)
  }
})

app.post('/api/v1/requests/:id/decisions', async (request, response, next) => {
  const { proposalId, decision, reason } = request.body ?? {}
  if (!proposalId || !['accepted', 'rejected'].includes(decision)) return response.status(400).json({ message: '제안과 결정값이 필요합니다.' })
  try {
    await pool.query(
      'insert into proposal_decisions (id, request_id, proposal_id, decision, reason) values ($1,$2,$3,$4,$5)',
      [randomUUID(), request.params.id, proposalId, decision, reason ?? null],
    )
    if (decision === 'accepted') {
      await pool.query("update freight_requests set status = 'pooling', updated_at = now() where id = $1", [request.params.id])
      await pool.query(
        `insert into pool_summaries (request_id, current_teu, target_teu, unit_cost, status)
         values ($1,15,18,640000,'pooling')
         on conflict (request_id) do update set current_teu = 15, target_teu = 18, unit_cost = 640000, status = 'pooling', updated_at = now()`,
        [request.params.id],
      )
    }
    response.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

app.post('/api/v1/requests/:id/demo/fill', async (request, response, next) => {
  try {
    await pool.query(
      `insert into pool_summaries (request_id, current_teu, target_teu, unit_cost, status)
       values ($1,18,18,607500,'target_reached')
       on conflict (request_id) do update set current_teu = 18, target_teu = 18, unit_cost = 607500, status = 'target_reached', updated_at = now()`,
      [request.params.id],
    )
    await pool.query(
      `insert into notifications (id, request_id, type, title, payload)
       values ($1,$2,'pool_filled','목표 물량을 채웠어요',$3::jsonb)`,
      [randomUUID(), request.params.id, JSON.stringify({ joinedTeu: 3, currentTeu: 18 })],
    )
    response.json({ currentTeu: 18, targetTeu: 18, joinedTeu: 3, unitCost: 607_500 })
  } catch (error) {
    next(error)
  }
})

app.post('/api/v1/requests/:id/demo/disruption', async (request, response, next) => {
  try {
    await pool.query(
      `insert into pool_summaries (request_id, current_teu, target_teu, unit_cost, status)
       values ($1,15,18,640000,'recovered')
       on conflict (request_id) do update set current_teu = 15, status = 'recovered', updated_at = now()`,
      [request.params.id],
    )
    await pool.query(
      `insert into notifications (id, request_id, type, title, payload)
       values ($1,$2,'disruption_recovered','새 참여사 조합으로 갱신됨',$3::jsonb)`,
      [randomUUID(), request.params.id, JSON.stringify({ beforeTeu: 11, currentTeu: 15 })],
    )
    response.json({ currentTeu: 15, targetTeu: 18, status: 'recovered' })
  } catch (error) {
    next(error)
  }
})

app.post('/api/v1/requests/:id/review', async (request, response, next) => {
  try {
    const existing = await pool.query('select * from review_requests where request_id = $1', [request.params.id])
    if (existing.rowCount) return response.json({ reviewRequest: existing.rows[0], duplicate: true })
    const sequence = await pool.query("select nextval('review_number_seq') as value")
    const id = `RV-2026-${String(sequence.rows[0].value).padStart(4, '0')}`
    const result = await pool.query(
      `insert into review_requests (id, request_id, status, payload)
       values ($1,$2,'submitted',$3::jsonb) returning *`,
      [id, request.params.id, JSON.stringify(request.body ?? {})],
    )
    await pool.query("update freight_requests set status = 'review_submitted', updated_at = now() where id = $1", [request.params.id])
    response.status(201).json({ reviewRequest: result.rows[0] })
  } catch (error) {
    next(error)
  }
})

app.use((error, request, response, _next) => {
  console.error(`[api] ${request.method} ${request.path}:`, error.message)
  response.status(500).json({ message: '요청을 처리하지 못했습니다. 입력값은 안전하게 유지됩니다.' })
})

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`[railpool-api] listening on ${port}`)
})

async function shutdown() {
  server.close(async () => {
    await closeDatabase()
    process.exit(0)
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

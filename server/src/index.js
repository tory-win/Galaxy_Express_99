import express from 'express'
import { randomUUID } from 'node:crypto'
import { closeDatabase, databaseHealth, pool } from './db.js'
import { PROPOSAL_ENGINE_VERSION, buildBaseline, buildProposals, extractConditionsFromText, validateFreightRequest } from './demo-engine.js'
import { extractWithAi } from './ai-client.js'
import { formatDepartureDate, formatTeu } from './presentation.js'
import { getPublicDataStatus } from './public-data.js'
import { ensureSchema } from './schema.js'
import { initializeAgentAuth, requireAgentAuth } from './agent-auth.js'
import {
  getActivePoolAssignment,
  getNetworkPlanningContext,
  getNetworkSnapshot,
  heartbeatAgent,
  performAgentAction,
  registerAgent,
} from './agent-service.js'
import { getPoolSnapshot, recalculatePool } from './pool-service.js'
import { closeEventStreams, openEventStream, publishLiveEvent } from './live-events.js'

const app = express()
const port = Number(process.env.PORT || 8320)
const aiRateLimit = Number(process.env.AI_RATE_LIMIT_PER_MINUTE || 12)
const aiRateWindows = new Map()
const currentYear = new Date().getUTCFullYear()

app.disable('x-powered-by')
app.use(express.json({ limit: '256kb' }))
app.use((request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Railpool-Agent-Token')
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  if (request.method === 'OPTIONS') return response.sendStatus(204)
  next()
})

function toRequest(row) {
  const payload = row.payload ?? {}
  const departureDate = formatDepartureDate(row.departure_date)
  const carbonSavingsTons = Number(row.carbon_savings_tons)
  const ecoPoints = Number.isFinite(carbonSavingsTons) && carbonSavingsTons > 0
    ? Math.round(carbonSavingsTons * 1_000)
    : null
  const statusLabels = {
    analyzing: '조건 확인 중',
    proposal_ready: '운송 제안 도착 · 2건',
    pooling: '함께 보내기 · 15/18TEU',
    target_reached: '목표 물량 달성',
    matching: '함께 보낼 화물 탐색 중',
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
    statusLabel: row.current_teu !== undefined && ['pooling', 'target_reached'].includes(row.status)
      ? `함께 보내기 · ${formatTeu(row.current_teu)}/${formatTeu(row.target_teu)}TEU`
      : statusLabels[row.status] ?? payload.statusLabel ?? '상태 확인 중',
    ecoPoints,
    updatedAt: formatRelativeTime(row.updated_at),
  }
}

function formatRelativeTime(value) {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (elapsedSeconds < 60) return '방금 전'
  if (elapsedSeconds < 3600) return `${Math.floor(elapsedSeconds / 60)}분 전`
  if (elapsedSeconds < 86_400) return `${Math.floor(elapsedSeconds / 3600)}시간 전`
  return `${Math.floor(elapsedSeconds / 86_400)}일 전`
}

async function ensureProposalsForRequest(freightRequest) {
  const existing = await pool.query('select payload from proposals where request_id = $1 order by rank', [freightRequest.id])
  if (existing.rowCount && existing.rows.every((row) => row.payload?.engineVersion === PROPOSAL_ENGINE_VERSION)) return existing.rows.map((row) => row.payload)
  const [network, sourceStatus] = await Promise.all([
    getNetworkPlanningContext(freightRequest.payload),
    getPublicDataStatus(),
  ])
  const publicDataConnected = sourceStatus.configured && sourceStatus.datasets.every((dataset) => dataset.status === 'connected')
  const proposals = buildProposals({ ...freightRequest.payload, roadCost: freightRequest.road_cost }, freightRequest.id, { ...network, publicDataConnected })
  for (const proposal of proposals) {
    await pool.query(
      `insert into proposals (id, request_id, type, rank, payload)
       values ($1,$2,$3,$4,$5::jsonb)
       on conflict (id) do update set payload = excluded.payload, updated_at = now()`,
      [proposal.id, freightRequest.id, proposal.type, proposal.recommended ? 1 : 2, JSON.stringify(proposal)],
    )
  }
  return proposals
}

app.get('/health', async (_request, response) => {
  const [database, network] = await Promise.all([databaseHealth(), getNetworkSnapshot()])
  response.status(database.ok ? 200 : 503).json({
    ok: database.ok,
    service: 'railpool-api',
    database,
    ai: { enabled: process.env.AI_ENABLED === 'true', model: process.env.AI_MODEL || 'gpt-5.6-sol' },
    publicData: { configured: Boolean(process.env.KORAIL_API_KEY) },
    agents: { active: network.activeAgents, total: network.totalAgents },
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
    const result = await pool.query(
      `select fr.*, ps.current_teu, ps.target_teu,
              recommended.payload->>'carbonSavings' as carbon_savings_tons
         from freight_requests fr
         left join pool_summaries ps on ps.request_id = fr.id
         left join lateral (
           select p.payload
             from proposals p
            where p.request_id = fr.id
            order by p.rank asc
            limit 1
         ) recommended on true
        where fr.user_id = 'rail-logistics-user'
        order by fr.updated_at desc limit 20`,
    )
    response.json({ requests: result.rows.map(toRequest) })
  } catch (error) {
    next(error)
  }
})

app.get('/api/v1/requests/:id', async (request, response, next) => {
  try {
    const found = await pool.query(
      `select fr.*, ps.current_teu, ps.target_teu
         from freight_requests fr
         left join pool_summaries ps on ps.request_id = fr.id
        where fr.id = $1 and fr.user_id = 'rail-logistics-user'`,
      [request.params.id],
    )
    if (!found.rowCount) return response.status(404).json({ message: '운송 요청을 찾지 못했습니다.' })
    const freightRequest = found.rows[0]
    const proposals = await ensureProposalsForRequest(freightRequest)
    const poolSnapshot = await getPoolSnapshot(freightRequest.id)
    response.json({
      request: toRequest(freightRequest),
      requestInput: freightRequest.payload,
      baseline: buildBaseline({ ...freightRequest.payload, roadCost: freightRequest.road_cost }),
      proposals,
      pool: poolSnapshot,
    })
  } catch (error) {
    next(error)
  }
})

app.get('/api/v1/network', async (_request, response, next) => {
  try {
    response.json(await getNetworkSnapshot())
  } catch (error) {
    next(error)
  }
})

app.get('/api/v1/pools/:id', async (request, response, next) => {
  try {
    const snapshot = await getPoolSnapshot(request.params.id)
    if (!snapshot) return response.status(404).json({ message: '함께 보내기 현황을 찾지 못했습니다.' })
    response.json({ pool: snapshot })
  } catch (error) {
    next(error)
  }
})

app.get('/api/v1/events', async (request, response, next) => {
  try {
    openEventStream(request, response, { network: await getNetworkSnapshot() })
  } catch (error) {
    next(error)
  }
})

app.post('/api/v1/agents/register', requireAgentAuth, async (request, response, next) => {
  try {
    const agent = await registerAgent(request.body ?? {})
    response.status(201).json({ agent: { id: agent.id, status: agent.status, lastSeenAt: agent.last_seen_at } })
  } catch (error) {
    next(error)
  }
})

app.post('/api/v1/agents/:id/heartbeat', requireAgentAuth, async (request, response, next) => {
  try {
    response.json({ agent: await heartbeatAgent(request.params.id, request.body ?? {}) })
  } catch (error) {
    next(error)
  }
})

app.get('/api/v1/agents/assignment/current', requireAgentAuth, async (_request, response, next) => {
  try {
    response.json({ assignment: await getActivePoolAssignment() })
  } catch (error) {
    next(error)
  }
})

app.post('/api/v1/agents/:id/actions', requireAgentAuth, async (request, response, next) => {
  try {
    const result = await performAgentAction(request.params.id, request.body ?? {})
    if (!result.duplicate) publishLiveEvent(result.event)
    response.status(result.duplicate ? 200 : 201).json(result)
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
    return response.status(429).json({ message: '조건 인식 요청이 많습니다. 잠시 후 다시 시도해 주세요.' })
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
    const id = `R-${currentYear}-${String(sequence.rows[0].value).padStart(4, '0')}`
    const input = { ...request.body }
    input.containerCount = Number(input.containerCount)
    input.teu = input.containerCount * (input.containerSize === '40ft' ? 2 : 1)
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
    const [network, sourceStatus] = await Promise.all([
      getNetworkPlanningContext(freightRequest.payload),
      getPublicDataStatus(),
    ])
    const publicDataConnected = sourceStatus.configured && sourceStatus.datasets.every((dataset) => dataset.status === 'connected')
    const proposals = buildProposals({ ...freightRequest.payload, roadCost: freightRequest.road_cost }, freightRequest.id, { ...network, publicDataConnected })
    const targetTeu = Number(proposals[0]?.targetTeu) || 18

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
      await client.query(
        `insert into pool_summaries (request_id, current_teu, target_teu, unit_cost, status)
         values ($1,$2,$3,null,'pooling')
         on conflict (request_id) do update
           set target_teu = excluded.target_teu, status = 'pooling', updated_at = now()`,
        [freightRequest.id, Number(freightRequest.teu), targetTeu],
      )
      await client.query(
        `insert into pool_members (request_id, member_id, display_name, region, teu, status, is_owner)
         values ($1,'owner-rail-logistics-user','내 화물',$2,$3,'confirmed',true)
         on conflict (request_id, member_id) do update set teu = excluded.teu, updated_at = now()`,
        [freightRequest.id, freightRequest.payload?.originLabel ?? freightRequest.origin, Number(freightRequest.teu)],
      )
      await recalculatePool(client, freightRequest.id)
      await client.query('commit')
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }

    response.json({
      request: toRequest({ ...freightRequest, status: 'pooling', current_teu: freightRequest.teu, target_teu: targetTeu, updated_at: new Date() }),
      baseline: buildBaseline({ ...freightRequest.payload, roadCost: freightRequest.road_cost }),
      proposals,
      sources: sourceStatus,
    })
  } catch (error) {
    next(error)
  }
})

app.post('/api/v1/requests/:id/decisions', async (request, response, next) => {
  const { proposalId, decision, reason } = request.body ?? {}
  if (!proposalId || !['accepted', 'rejected', 'cancelled'].includes(decision)) return response.status(400).json({ message: '제안과 결정값이 필요합니다.' })
  try {
    if (decision === 'cancelled') {
      await pool.query("update freight_requests set status = 'cancelled', updated_at = now() where id = $1", [request.params.id])
      await pool.query('delete from pool_members where request_id = $1 and is_owner = true', [request.params.id])
      return response.json({ decision, cancelled: true })
    }
    await pool.query(
      'insert into proposal_decisions (id, request_id, proposal_id, decision, reason) values ($1,$2,$3,$4,$5)',
      [randomUUID(), request.params.id, proposalId, decision, reason ?? null],
    )
    if (decision === 'accepted') {
      const freight = await pool.query('select * from freight_requests where id = $1', [request.params.id])
      if (!freight.rowCount) return response.status(404).json({ message: '운송 요청을 찾지 못했습니다.' })
      const client = await pool.connect()
      try {
        await client.query('begin')
        await client.query(
          `insert into pool_summaries (request_id, current_teu, target_teu, unit_cost, status)
           values ($1,$2,18,640000,'pooling')
           on conflict (request_id) do update set target_teu = 18, status = 'pooling', updated_at = now()`,
          [request.params.id, Number(freight.rows[0].teu)],
        )
        await client.query(
          `insert into pool_members (request_id, member_id, display_name, region, teu, status, is_owner)
           values ($1,'owner-rail-logistics-user','내 화물',$2,$3,'confirmed',true)
           on conflict (request_id, member_id) do update set teu = excluded.teu, updated_at = now()`,
          [request.params.id, freight.rows[0].payload?.originLabel ?? '충남 서북부', Number(freight.rows[0].teu)],
        )
        await recalculatePool(client, request.params.id)
        await client.query('commit')
      } catch (error) {
        await client.query('rollback')
        throw error
      } finally {
        client.release()
      }
    }
    response.json({ ok: true, pool: decision === 'accepted' ? await getPoolSnapshot(request.params.id) : null })
  } catch (error) {
    next(error)
  }
})

app.post('/api/v1/requests/:id/review', async (request, response, next) => {
  try {
    const existing = await pool.query('select * from review_requests where request_id = $1', [request.params.id])
    if (existing.rowCount) return response.json({ reviewRequest: existing.rows[0], duplicate: true })
    const sequence = await pool.query("select nextval('review_number_seq') as value")
    const id = `RV-${currentYear}-${String(sequence.rows[0].value).padStart(4, '0')}`
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
  response.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : '요청을 처리하지 못했습니다. 입력값은 안전하게 유지됩니다.' })
})

await ensureSchema(pool)
await initializeAgentAuth()

const server = app.listen(port, '0.0.0.0', () => console.log(`[railpool-api] listening on ${port}`))

async function shutdown() {
  closeEventStreams()
  server.close(async () => {
    await closeDatabase()
    process.exit(0)
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

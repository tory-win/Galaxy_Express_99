import { randomUUID } from 'node:crypto'
import { pool } from './db.js'
import { recalculatePool } from './pool-service.js'

const AGENT_ID_PATTERN = /^shipper-(0[1-9]|10)$/
const ACTIONS = new Set(['publish_request', 'join_pool', 'leave_pool'])

function cleanText(value, fallback, maxLength = 80) {
  const normalized = String(value ?? '').trim().slice(0, maxLength)
  return normalized || fallback
}

function validateAgentId(agentId) {
  if (!AGENT_ID_PATTERN.test(agentId)) throw Object.assign(new Error('올바르지 않은 화주 에이전트 ID입니다.'), { statusCode: 400 })
}

function publicEvent(row) {
  return {
    id: row.id,
    agentId: row.agent_id,
    type: row.event_type,
    requestId: row.request_id,
    payload: row.payload,
    createdAt: row.created_at,
  }
}

export async function registerAgent(input) {
  const agentId = cleanText(input?.id, '', 20)
  validateAgentId(agentId)
  const values = {
    displayName: cleanText(input.displayName, `화주 ${agentId.slice(-2)}`, 30),
    region: cleanText(input.region, '권역 미정', 40),
    cargoType: cleanText(input.cargoType, '일반 화물', 40),
    strategy: cleanText(input.strategy, '정시 출고', 40),
    containerId: cleanText(input.containerId, 'unknown', 80),
    payload: input.payload && typeof input.payload === 'object' ? input.payload : {},
  }
  const result = await pool.query(
    `insert into shipper_agents
       (id, display_name, region, cargo_type, strategy, container_id, status, payload)
     values ($1,$2,$3,$4,$5,$6,'online',$7::jsonb)
     on conflict (id) do update
       set display_name = excluded.display_name,
           region = excluded.region,
           cargo_type = excluded.cargo_type,
           strategy = excluded.strategy,
           container_id = excluded.container_id,
           status = 'online',
           payload = excluded.payload,
           last_seen_at = now(),
           updated_at = now()
     returning *`,
    [agentId, values.displayName, values.region, values.cargoType, values.strategy, values.containerId, JSON.stringify(values.payload)],
  )
  return result.rows[0]
}

export async function heartbeatAgent(agentId, input = {}) {
  validateAgentId(agentId)
  const cycle = Number.isInteger(input.cycle) && input.cycle >= 0 ? input.cycle : 0
  const result = await pool.query(
    `update shipper_agents
        set status = 'online', cycle = $2, last_seen_at = now(), updated_at = now()
      where id = $1 returning id, status, cycle, last_seen_at`,
    [agentId, cycle],
  )
  if (!result.rowCount) throw Object.assign(new Error('등록되지 않은 화주 에이전트입니다.'), { statusCode: 404 })
  return result.rows[0]
}

async function publishFreightRequest(client, agent, payload) {
  const requestId = `AR-2026-${agent.id.slice(-2)}`
  const containerSize = payload.containerSize === '40ft' ? '40ft' : '20ft'
  const containerCount = Math.max(1, Math.min(8, Number(payload.containerCount) || 1))
  const teu = Math.max(1, Math.min(12, Number(payload.teu) || (containerSize === '40ft' ? containerCount * 2 : containerCount)))
  const origin = cleanText(payload.origin, agent.region, 80)
  const destination = cleanText(payload.destination, '부산신항', 80)
  const departureDate = /^\d{4}-\d{2}-\d{2}$/.test(payload.departureDate) ? payload.departureDate : '2026-08-19'
  const deadline = payload.deadline && !Number.isNaN(Date.parse(payload.deadline)) ? payload.deadline : `${departureDate}T23:00:00+09:00`
  const roadCost = Math.max(0, Math.round(Number(payload.roadCost) || 0)) || null
  const requestPayload = {
    agentId: agent.id,
    originLabel: agent.region,
    destinationLabel: destination,
    cargo: agent.cargo_type,
    strategy: agent.strategy,
    statusLabel: '함께 보낼 화물 탐색 중',
  }

  await client.query(
    `insert into freight_requests
       (id, user_id, origin, destination, container_size, container_count, teu, departure_date, deadline_at, hazardous, road_cost, status, payload)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,false,$10,'matching',$11::jsonb)
     on conflict (id) do update
       set origin = excluded.origin,
           destination = excluded.destination,
           container_size = excluded.container_size,
           container_count = excluded.container_count,
           teu = excluded.teu,
           departure_date = excluded.departure_date,
           deadline_at = excluded.deadline_at,
           road_cost = excluded.road_cost,
           status = 'matching',
           payload = excluded.payload,
           updated_at = now()`,
    [requestId, agent.id, origin, destination, containerSize, containerCount, teu, departureDate, deadline, roadCost, JSON.stringify(requestPayload)],
  )
  return {
    eventType: 'request_published',
    requestId,
    payload: { region: agent.region, destination, teu, cargoType: agent.cargo_type },
  }
}

async function joinPool(client, agent, payload) {
  const requestId = cleanText(payload.requestId, 'R-2026-0108', 30)
  const summary = await client.query('select * from pool_summaries where request_id = $1 for update', [requestId])
  if (!summary.rowCount) throw Object.assign(new Error('참여할 함께 보내기를 찾지 못했습니다.'), { statusCode: 404 })
  const teu = Math.max(1, Math.min(8, Number(payload.teu) || 1))
  const before = await client.query(
    `select coalesce(sum(teu) filter (where status = 'confirmed'), 0) as current_teu
       from pool_members where request_id = $1`,
    [requestId],
  )
  const existing = await client.query('select * from pool_members where request_id = $1 and agent_id = $2', [requestId, agent.id])
  const currentTeu = Number(before.rows[0].current_teu)
  const targetTeu = Number(summary.rows[0].target_teu)
  if (!existing.rowCount && currentTeu + teu > targetTeu) {
    return {
      eventType: 'capacity_waiting',
      requestId,
      payload: { region: agent.region, teu, currentTeu, targetTeu },
    }
  }

  await client.query(
    `insert into pool_members
       (request_id, member_id, agent_id, display_name, region, teu, status, is_owner)
     values ($1,$2,$2,$3,$4,$5,'confirmed',false)
     on conflict (request_id, member_id) do update
       set display_name = excluded.display_name,
           region = excluded.region,
           teu = excluded.teu,
           status = 'confirmed',
           updated_at = now()`,
    [requestId, agent.id, agent.display_name, agent.region, teu],
  )
  const recalculated = await recalculatePool(client, requestId)
  return {
    eventType: existing.rowCount ? 'pool_membership_refreshed' : 'pool_joined',
    requestId,
    payload: { region: agent.region, joinedTeu: teu, ...recalculated },
  }
}

async function leavePool(client, agent, payload) {
  const requestId = cleanText(payload.requestId, 'R-2026-0108', 30)
  const removed = await client.query(
    'delete from pool_members where request_id = $1 and agent_id = $2 returning teu',
    [requestId, agent.id],
  )
  if (!removed.rowCount) {
    return { eventType: 'pool_membership_unchanged', requestId, payload: { region: agent.region } }
  }
  const recalculated = await recalculatePool(client, requestId)
  return {
    eventType: 'pool_left',
    requestId,
    payload: { region: agent.region, leftTeu: Number(removed.rows[0].teu), ...recalculated },
  }
}

export async function performAgentAction(agentId, input) {
  validateAgentId(agentId)
  const action = cleanText(input?.type, '', 40)
  const idempotencyKey = cleanText(input?.idempotencyKey, '', 120)
  if (!ACTIONS.has(action) || !idempotencyKey) {
    throw Object.assign(new Error('에이전트 행동과 idempotencyKey가 필요합니다.'), { statusCode: 400 })
  }

  const client = await pool.connect()
  try {
    await client.query('begin')
    const duplicate = await client.query(
      'select * from agent_events where agent_id = $1 and idempotency_key = $2',
      [agentId, idempotencyKey],
    )
    if (duplicate.rowCount) {
      await client.query('rollback')
      return { duplicate: true, event: publicEvent(duplicate.rows[0]) }
    }

    const agentResult = await client.query('select * from shipper_agents where id = $1 for update', [agentId])
    if (!agentResult.rowCount) throw Object.assign(new Error('등록되지 않은 화주 에이전트입니다.'), { statusCode: 404 })
    const agent = agentResult.rows[0]
    const payload = input.payload && typeof input.payload === 'object' ? input.payload : {}
    const outcome = action === 'publish_request'
      ? await publishFreightRequest(client, agent, payload)
      : action === 'join_pool'
        ? await joinPool(client, agent, payload)
        : await leavePool(client, agent, payload)

    const inserted = await client.query(
      `insert into agent_events (id, agent_id, event_type, request_id, idempotency_key, payload)
       values ($1,$2,$3,$4,$5,$6::jsonb) returning *`,
      [randomUUID(), agentId, outcome.eventType, outcome.requestId, idempotencyKey, JSON.stringify(outcome.payload)],
    )
    await client.query(
      `update shipper_agents
          set last_action = $2, cycle = greatest(cycle, $3), last_seen_at = now(), updated_at = now()
        where id = $1`,
      [agentId, action, Number.isInteger(input.cycle) ? input.cycle : 0],
    )
    await client.query('commit')
    return { duplicate: false, event: publicEvent(inserted.rows[0]) }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

export async function getNetworkSnapshot() {
  const [counts, agents, events] = await Promise.all([
    pool.query(
      `select count(*)::int as total,
              count(*) filter (where last_seen_at > now() - interval '20 seconds')::int as active
         from shipper_agents`,
    ),
    pool.query(
      `select id, display_name, region, cargo_type, strategy, status, cycle, last_action, last_seen_at
         from shipper_agents order by id`,
    ),
    pool.query(
      `select id, agent_id, event_type, request_id, payload, created_at
         from agent_events
        where event_type not in ('pool_membership_refreshed', 'pool_membership_unchanged', 'capacity_waiting')
        order by created_at desc limit 12`,
    ),
  ])
  return {
    totalAgents: counts.rows[0].total,
    activeAgents: counts.rows[0].active,
    agents: agents.rows.map((agent) => ({
      id: agent.id,
      name: agent.display_name,
      region: agent.region,
      cargoType: agent.cargo_type,
      strategy: agent.strategy,
      status: new Date(agent.last_seen_at).getTime() > Date.now() - 20_000 ? 'online' : 'offline',
      cycle: agent.cycle,
      lastAction: agent.last_action,
      lastSeenAt: agent.last_seen_at,
    })),
    recentEvents: events.rows.map(publicEvent),
    generatedAt: new Date().toISOString(),
  }
}

export async function getNetworkPlanningContext(input = {}) {
  const destination = cleanText(input.destination, '', 80)
  const result = await pool.query(
    `select count(*)::int as matching_agents,
            coalesce(sum((sa.payload->>'teu')::numeric), 0) as matching_teu
       from shipper_agents sa
      where sa.last_seen_at > now() - interval '20 seconds'
        and ($1 = '' or lower(sa.payload->>'destination') = lower($1))`,
    [destination],
  )
  return {
    matchingAgents: result.rows[0].matching_agents,
    matchingTeu: Number(result.rows[0].matching_teu),
  }
}

export async function getActivePoolAssignment() {
  const result = await pool.query(
    `select ps.request_id, ps.current_teu, ps.target_teu, ps.status, ps.updated_at, fr.destination
       from pool_summaries ps
       join freight_requests fr on fr.id = ps.request_id
      where fr.user_id = 'rail-logistics-user'
        and fr.status in ('pooling', 'target_reached')
      order by fr.created_at desc, ps.updated_at desc
      limit 1`,
  )
  if (!result.rowCount) return null
  const row = result.rows[0]
  return {
    requestId: row.request_id,
    currentTeu: Number(row.current_teu),
    targetTeu: Number(row.target_teu),
    status: row.status,
    destination: row.destination,
    updatedAt: row.updated_at,
  }
}

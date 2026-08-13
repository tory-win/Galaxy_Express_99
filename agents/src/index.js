import http from 'node:http'
import { readFile } from 'node:fs/promises'
import os from 'node:os'
import { personaFor } from './personas.js'
import { desiredMembership } from './policy.js'

const agentId = process.env.AGENT_ID
const apiBase = process.env.API_BASE_URL || 'http://api:8320/api/v1'
const tokenPath = process.env.AGENT_TOKEN_PATH || '/run/railpool/agent-api-token'
const heartbeatMs = Number(process.env.HEARTBEAT_MS || 5_000)
const tickMs = Number(process.env.AGENT_TICK_MS || 5_000)
const persona = personaFor(agentId)
const memberships = new Map()
let token = ''
let cycle = 0
let running = false
let lastSuccessAt = 0
let lastError = ''
let currentAssignmentId = ''

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function loadToken() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      token = (await readFile(tokenPath, 'utf8')).trim()
      if (token.length >= 32) return
    } catch {
      // The API creates the shared token before it becomes healthy.
    }
    await sleep(500)
  }
  throw new Error('Agent API token was not created in time')
}

async function api(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Railpool-Agent-Token': token,
      ...options.headers,
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.message || `API ${response.status}`)
  lastSuccessAt = Date.now()
  lastError = ''
  return payload
}

async function register() {
  await api('/agents/register', {
    method: 'POST',
    body: JSON.stringify({
      id: agentId,
      displayName: persona.displayName,
      region: persona.region,
      cargoType: persona.cargoType,
      strategy: persona.strategy,
      containerId: os.hostname(),
      payload: { poolRole: persona.poolRole, destination: persona.destination, teu: persona.teu },
    }),
  })
}

async function heartbeat() {
  await api(`/agents/${agentId}/heartbeat`, {
    method: 'POST',
    body: JSON.stringify({ cycle }),
  })
}

async function assignment() {
  return (await api('/agents/assignment/current')).assignment
}

async function currentMembership(requestId) {
  const payload = await api(`/pools/${encodeURIComponent(requestId)}`)
  return payload.pool?.participants?.some((participant) => participant.agentId === agentId) ?? false
}

async function action(type, idempotencyKey, payload) {
  const result = await api(`/agents/${agentId}/actions`, {
    method: 'POST',
    body: JSON.stringify({ type, idempotencyKey, cycle, payload }),
  })
  process.stdout.write(`${JSON.stringify({ at: new Date().toISOString(), agentId, type, event: result.event?.type, duplicate: result.duplicate })}\n`)
  return result
}

async function runOneStep() {
  cycle += 1
  const now = Date.now()
  const activeAssignment = await assignment()
  if (!activeAssignment) return
  if (activeAssignment.destination !== persona.destination) return
  if (currentAssignmentId && currentAssignmentId !== activeAssignment.requestId) memberships.set(currentAssignmentId, false)
  currentAssignmentId = activeAssignment.requestId

  const desired = desiredMembership(persona.poolRole, now)
  const joined = await currentMembership(currentAssignmentId)
  memberships.set(currentAssignmentId, joined)
  if (desired && !joined) {
    const attemptBucket = Math.floor(now / tickMs)
    const result = await action('join_pool', `join:${currentAssignmentId}:${attemptBucket}`, { requestId: currentAssignmentId, teu: persona.teu })
    memberships.set(currentAssignmentId, result.event?.type === 'pool_joined' || result.event?.type === 'pool_membership_refreshed')
    return
  }
  if (!desired && joined) {
    const phaseBucket = Math.floor(now / 30_000)
    await action('leave_pool', `leave:${currentAssignmentId}:${phaseBucket}`, { requestId: currentAssignmentId })
    memberships.set(currentAssignmentId, false)
  }
}

async function tick() {
  if (running) return
  running = true
  try {
    await runOneStep()
  } catch (error) {
    lastError = error.message
    process.stderr.write(`[${agentId}] ${error.message}\n`)
  } finally {
    running = false
  }
}

const healthServer = http.createServer((_request, response) => {
  const healthy = lastSuccessAt > Date.now() - 20_000
  response.writeHead(healthy ? 200 : 503, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify({ ok: healthy, agentId, cycle, lastSuccessAt, lastError }))
})

await loadToken()
await register()
await sleep(Number(agentId.slice(-2)) * 350)
await heartbeat()
healthServer.listen(8787, '0.0.0.0')
setInterval(() => heartbeat().catch((error) => { lastError = error.message }), heartbeatMs).unref()
setInterval(() => tick(), tickMs)
await tick()

import { pool } from './db.js'

const numberValue = (value) => Number(value ?? 0)

export async function recalculatePool(client, requestId) {
  const locked = await client.query('select * from pool_summaries where request_id = $1 for update', [requestId])
  if (!locked.rowCount) throw new Error(`Pool not found for ${requestId}`)

  const memberResult = await client.query(
    `select coalesce(sum(teu) filter (where status = 'confirmed'), 0) as current_teu
       from pool_members where request_id = $1`,
    [requestId],
  )
  const currentTeu = numberValue(memberResult.rows[0].current_teu)
  const targetTeu = numberValue(locked.rows[0].target_teu)
  const status = currentTeu >= targetTeu ? 'target_reached' : 'pooling'
  const unitCost = currentTeu >= targetTeu
    ? 607_500
    : Math.max(607_500, Math.round(640_000 - Math.max(0, currentTeu - 15) * 10_833))

  await client.query(
    `update pool_summaries
        set current_teu = $2, unit_cost = $3, status = $4, updated_at = now()
      where request_id = $1`,
    [requestId, currentTeu, unitCost, status],
  )
  await client.query(
    `update freight_requests set status = $2, updated_at = now() where id = $1`,
    [requestId, status === 'target_reached' ? 'target_reached' : 'pooling'],
  )
  return { currentTeu, targetTeu, unitCost, status }
}

export async function getPoolSnapshot(requestId, database = pool) {
  const [summaryResult, memberResult] = await Promise.all([
    database.query('select * from pool_summaries where request_id = $1', [requestId]),
    database.query(
      `select member_id, agent_id, display_name, region, teu, status, is_owner, joined_at, updated_at
         from pool_members where request_id = $1
        order by is_owner desc, joined_at asc`,
      [requestId],
    ),
  ])
  if (!summaryResult.rowCount) return null
  const row = summaryResult.rows[0]
  return {
    requestId,
    currentTeu: numberValue(row.current_teu),
    targetTeu: numberValue(row.target_teu),
    unitCost: numberValue(row.unit_cost),
    status: row.status,
    updatedAt: row.updated_at,
    participants: memberResult.rows.map((member) => ({
      id: member.member_id,
      agentId: member.agent_id,
      name: member.display_name,
      region: member.region,
      teu: numberValue(member.teu),
      status: member.status === 'confirmed' ? '확정' : '조건 확인 중',
      mine: member.is_owner,
      joinedAt: member.joined_at,
      updatedAt: member.updated_at,
    })),
  }
}


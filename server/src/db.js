import pg from 'pg'

const { Pool } = pg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://railpool:railpool@localhost:55432/railpool',
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 3_000,
})

pool.on('error', (error) => {
  console.error('[database] idle client error:', error.message)
})

export async function databaseHealth() {
  try {
    const result = await pool.query('select now() as now')
    return { ok: true, now: result.rows[0].now }
  } catch (error) {
    return { ok: false, error: error.message }
  }
}

export async function closeDatabase() {
  await pool.end()
}

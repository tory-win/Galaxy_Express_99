import { randomBytes, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const tokenDirectory = process.env.AGENT_TOKEN_DIRECTORY || '/run/railpool'
const tokenPath = path.join(tokenDirectory, 'agent-api-token')
let agentToken = ''

export async function initializeAgentAuth() {
  await mkdir(tokenDirectory, { recursive: true })
  try {
    agentToken = (await readFile(tokenPath, 'utf8')).trim()
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    const generated = randomBytes(32).toString('hex')
    try {
      await writeFile(tokenPath, generated, { flag: 'wx', mode: 0o600 })
      agentToken = generated
    } catch (writeError) {
      if (writeError.code !== 'EEXIST') throw writeError
      agentToken = (await readFile(tokenPath, 'utf8')).trim()
    }
  }
  if (agentToken.length < 32) throw new Error('Agent API token is invalid')
}

export function requireAgentAuth(request, response, next) {
  const supplied = String(request.get('x-railpool-agent-token') || '')
  const expected = Buffer.from(agentToken)
  const candidate = Buffer.from(supplied)
  if (!supplied || expected.length !== candidate.length || !timingSafeEqual(expected, candidate)) {
    return response.status(401).json({ message: '화주 에이전트 인증이 필요합니다.' })
  }
  next()
}


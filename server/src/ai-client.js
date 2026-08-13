function extractOutputText(payload) {
  if (typeof payload?.output_text === 'string') return payload.output_text
  const content = payload?.output?.flatMap((item) => item.content ?? []) ?? []
  return content.find((item) => item.type === 'output_text')?.text ?? null
}

function cleanString(value, maxLength = 160) {
  if (typeof value !== 'string') return null
  const cleaned = value.trim().replace(/\s+/g, ' ')
  return cleaned ? cleaned.slice(0, maxLength) : null
}

function cleanPositiveNumber(value, { integer = false, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = typeof value === 'number'
    ? value
    : Number(String(value ?? '').replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > max) return null
  return integer ? Math.round(parsed) : parsed
}

function cleanWon(value) {
  if (typeof value === 'number') return cleanPositiveNumber(value, { integer: true, max: 1_000_000_000 })
  const text = cleanString(value)
  if (!text) return null
  const amount = cleanPositiveNumber(text, { max: 1_000_000_000 })
  if (!amount) return null
  const multiplier = /억\s*원?/.test(text) ? 100_000_000 : /만\s*원?/.test(text) ? 10_000 : 1
  const won = Math.round(amount * multiplier)
  return won <= 1_000_000_000 ? won : null
}

function cleanDate(value, includeTime = false) {
  const text = cleanString(value)
  if (!text) return null
  const matched = text.match(includeTime
    ? /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/
    : /\d{4}-\d{2}-\d{2}/)
  return matched ? matched[0].replace(' ', 'T') : null
}

export function normalizeAiExtraction(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return {}
  const normalized = {}

  for (const key of ['origin', 'destination', 'cargo']) {
    const value = cleanString(candidate[key])
    if (value) normalized[key] = value
  }

  const containerMatch = cleanString(candidate.containerSize)?.match(/(20|40)\s*ft/i)
  if (containerMatch) normalized.containerSize = `${containerMatch[1]}ft`

  const containerCount = cleanPositiveNumber(candidate.containerCount, { integer: true, max: 999 })
  if (containerCount) normalized.containerCount = containerCount

  const departureDate = cleanDate(candidate.departureDate)
  if (departureDate) normalized.departureDate = departureDate

  const deadline = cleanDate(candidate.deadline, true)
  if (deadline) normalized.deadline = deadline

  if (typeof candidate.hazardous === 'boolean') normalized.hazardous = candidate.hazardous ? 'yes' : 'no'
  if (typeof candidate.hazardous === 'string') {
    const value = candidate.hazardous.trim().toLowerCase()
    if (['yes', 'true', '예', '맞음', '위험물'].includes(value)) normalized.hazardous = 'yes'
    if (['no', 'false', '아니오', '아님', '비위험물'].includes(value)) normalized.hazardous = 'no'
  }

  const roadCost = cleanWon(candidate.roadCost)
  if (roadCost) normalized.roadCost = roadCost

  const weightTons = cleanPositiveNumber(candidate.weightTons, { max: 10_000 })
  if (weightTons) normalized.weightTons = weightTons

  if (normalized.containerCount && (normalized.containerSize === '20ft' || normalized.containerSize === '40ft')) {
    normalized.teu = normalized.containerCount * (normalized.containerSize === '40ft' ? 2 : 1)
  }

  return normalized
}

export async function extractWithAi(text) {
  if (process.env.AI_ENABLED !== 'true') return null
  const url = process.env.AI_API_URL || 'http://host.docker.internal:8318/v1/responses'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.AI_API_KEY ? { Authorization: `Bearer ${process.env.AI_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'gpt-5.6-sol',
        input: [
          { role: 'system', content: '화물 운송 메일에서 원문에 있는 값만 JSON으로 추출하세요. 없는 값은 null로 두세요. 키: origin,destination,containerSize,containerCount,departureDate,deadline,hazardous,roadCost,cargo,weightTons.' },
          { role: 'user', content: text },
        ],
      }),
    })
    if (!response.ok) return null
    const payload = await response.json()
    const outputText = extractOutputText(payload)
    if (!outputText) return null
    const json = outputText.match(/\{[\s\S]*\}/)?.[0]
    return json ? normalizeAiExtraction(JSON.parse(json)) : null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

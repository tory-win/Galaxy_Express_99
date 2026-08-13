import assert from 'node:assert/strict'
import test from 'node:test'
import { buildProposals, extractConditionsFromText, validateFreightRequest } from '../src/demo-engine.js'
import { normalizeAiExtraction } from '../src/ai-client.js'
import { formatDepartureDate, formatTeu } from '../src/presentation.js'

test('extracts only supported values from a freight email', () => {
  const result = extractConditionsFromText('아산 음봉 공장에서 부산신항까지 20ft 컨테이너 4개를 보냅니다. 8월 18일 출발, 8월 20일 오전 9시 도착. 위험물은 아닙니다. 도로 운송 견적은 312만원입니다.')
  assert.equal(result.fields.containerSize, '20ft')
  assert.equal(result.fields.containerCount, 4)
  assert.equal(result.fields.teu, 4)
  assert.equal(result.fields.hazardous, 'no')
  assert.equal(result.fields.roadCost, 3_120_000)
  assert.equal(result.missing.length, 0)
})

test('does not approve hazardous freight automatically', () => {
  const result = validateFreightRequest({ origin: 'A', destination: 'B', containerSize: '20ft', containerCount: 1, departureDate: '2026-08-18', deadline: '2026-08-20T09:00', hazardous: 'yes' })
  assert.equal(result.ok, false)
  assert.equal(result.hazardous, true)
})

test('builds two ranked proposals from the baseline and live network capacity', () => {
  const proposals = buildProposals(
    { roadCost: 3_120_000, teu: 4, departureDate: '2026-08-18', deadline: '2026-08-20T09:00', destination: '부산신항' },
    'R-TEST',
    { matchingAgents: 8, matchingTeu: 24, publicDataConnected: true },
  )
  assert.equal(proposals.length, 2)
  assert.equal(proposals[0].savingsRate, 18)
  assert.equal(proposals[0].cost, 2_560_000)
  assert.equal(proposals[1].savingsRate, 22)
  assert.ok(proposals[1].cost < proposals[0].cost)
  assert.equal(proposals[0].matchingAgents, 8)
  assert.equal(proposals[0].pooledTeu, 18)
  assert.match(proposals[0].reason, /24TEU/)
  assert.ok(proposals[0].confidence.includes('철도 시간표 확인 완료'))
  assert.equal(proposals[0].breakdown.reduce((sum, [, value]) => sum + value, 0), proposals[0].cost)
  assert.equal(proposals[0].breakdown[2][2], '확인 필요')
})

test('does not render a zero-shipper claim when no same-destination freight is connected', () => {
  const proposals = buildProposals(
    { roadCost: 3_120_000, teu: 4, departureDate: '2026-08-18', deadline: '2026-08-20T09:00', destination: '강경' },
    'R-NO-MATCH',
    { matchingAgents: 0, matchingTeu: 0, publicDataConnected: true },
  )

  assert.doesNotMatch(proposals[0].summary, /화주 0곳/)
  assert.match(proposals[0].summary, /참여 화물이 연결되면/)
  assert.doesNotMatch(proposals[1].after, /화주 0곳/)
  assert.doesNotMatch(proposals[1].summary, /연결된 0TEU/)
})

test('returns one exact-match plan when capacity and the requested deadline already fit', () => {
  const proposals = buildProposals(
    { roadCost: 3_120_000, teu: 4, departureDate: '2026-08-18', deadline: '2026-08-20T15:00', origin: '서화성', destination: '부산신항' },
    'R-EXACT',
    { matchingAgents: 8, matchingTeu: 24, publicDataConnected: true },
  )

  assert.equal(proposals.length, 1)
  assert.equal(proposals[0].exactMatch, true)
  assert.equal(proposals[0].type, '조건 일치 운송안')
  assert.equal(proposals[0].deadlineMet, true)
  assert.deepEqual(proposals[0].axes, [])
})

test('does not invent unsupported freight values during rule extraction', () => {
  const result = extractConditionsFromText('일반 화물을 보내고 싶습니다.')
  assert.deepEqual(result.fields, {})
  assert.deepEqual(result.missing, ['origin', 'destination', 'containerCount', 'departureDate', 'deadline', 'hazardous'])
})

test('normalizes AI extraction before values reach the freight form', () => {
  const result = normalizeAiExtraction({
    origin: '  아산 음봉 공장  ',
    destination: '부산신항',
    containerSize: '20 FT',
    containerCount: '4개',
    departureDate: '2026-08-18 (화)',
    deadline: '2026-08-20T09:00:00+09:00',
    hazardous: false,
    roadCost: '312만원',
    weightTons: '48톤',
    contact: '허용되지 않는 필드',
  })

  assert.deepEqual(result, {
    origin: '아산 음봉 공장',
    destination: '부산신항',
    containerSize: '20ft',
    containerCount: 4,
    departureDate: '2026-08-18',
    deadline: '2026-08-20T09:00',
    hazardous: 'no',
    roadCost: 3_120_000,
    weightTons: 48,
    teu: 4,
  })
})

test('formats PostgreSQL dates and TEU values consistently for the dashboard', () => {
  assert.equal(formatDepartureDate('2026-08-18'), '8월 18일(화)')
  assert.equal(formatDepartureDate(new Date('2026-08-18T00:00:00+09:00')), '8월 18일(화)')
  assert.equal(formatTeu('4.00'), '4')
  assert.equal(formatTeu('4.50'), '4.50')
})

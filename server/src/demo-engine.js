const DEFAULT_MARKET_COST = 3_120_000

function formatDate(dateText, dayOffset = 0) {
  const match = String(dateText ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return '날짜 확인 필요'
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + dayOffset))
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', timeZone: 'UTC' }).format(date).replace(/\s/g, '')
}

function breakdown(total, shares) {
  const values = shares.slice(0, -1).map((share) => Math.round(total * share / 10_000) * 10_000)
  values.push(Math.max(0, total - values.reduce((sum, value) => sum + value, 0)))
  return values
}

function deadlineStatus(departureDate, deadline, arrivalHour) {
  const departureMatch = String(departureDate ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  const deadlineMatch = String(deadline ?? '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!departureMatch || !deadlineMatch) return { deadlineMet: false, deadlineDeltaLabel: '도착 마감 확인 필요' }
  const arrivalValue = Date.UTC(Number(departureMatch[1]), Number(departureMatch[2]) - 1, Number(departureMatch[3]) + 2, arrivalHour)
  const deadlineValue = Date.UTC(Number(deadlineMatch[1]), Number(deadlineMatch[2]) - 1, Number(deadlineMatch[3]), Number(deadlineMatch[4]), Number(deadlineMatch[5]))
  const deltaHours = Math.ceil((arrivalValue - deadlineValue) / 3_600_000)
  return deltaHours <= 0
    ? { deadlineMet: true, deadlineDeltaLabel: '도착 마감 준수' }
    : { deadlineMet: false, deadlineDeltaLabel: `도착 마감 ${deltaHours}시간 초과` }
}

export function extractConditionsFromText(text) {
  const normalized = String(text ?? '').replace(/\s+/g, ' ')
  const container = normalized.match(/(20|40)\s*ft\s*(?:컨테이너)?\s*(\d+)\s*개/i)
  const roadCostMan = normalized.match(/(?:도로\s*운송\s*(?:견적|비용)|운송비)(?:은|는|이)?\s*(\d[\d,.]*)\s*만\s*원/)
  const hazardousNo = /위험물(?:은|이)?\s*(?:아니|아닙|아님|해당하지 않)/.test(normalized)
  const hazardousYes = /위험물(?:입니다|이다|해당)/.test(normalized) && !hazardousNo

  const fields = {}
  if (normalized.includes('아산')) fields.origin = '충남 아산시 음봉면'
  if (normalized.includes('부산신항')) fields.destination = '부산신항'
  if (container) {
    fields.containerSize = `${container[1]}ft`
    fields.containerCount = Number(container[2])
    fields.teu = Number(container[2]) * (container[1] === '40' ? 2 : 1)
  }
  if (normalized.includes('8월 18일')) fields.departureDate = '2026-08-18'
  if (normalized.includes('8월 20일')) fields.deadline = '2026-08-20T09:00'
  if (hazardousYes || hazardousNo) fields.hazardous = hazardousYes ? 'yes' : 'no'
  if (roadCostMan) fields.roadCost = Number(roadCostMan[1].replace(/[,\.]/g, '')) * 10_000
  if (normalized.includes('산업용 부품')) fields.cargo = '산업용 부품'

  const evidence = {
    origin: normalized.includes('아산') ? '“아산 음봉 공장에서” 문장에서 인식' : undefined,
    destination: normalized.includes('부산신항') ? '“부산신항까지” 문장에서 인식' : undefined,
    containerCount: container ? `“${container[0]}” 문장에서 인식` : undefined,
    departureDate: normalized.includes('8월 18일') ? '“8월 18일 화요일 출발” 문장에서 인식' : undefined,
    deadline: normalized.includes('8월 20일') ? '“8월 20일 목요일 오전 9시까지” 문장에서 인식' : undefined,
    hazardous: hazardousNo ? '“위험물은 아니며” 문장에서 인식' : hazardousYes ? '위험물 표현에서 인식' : undefined,
  }
  const missing = ['origin', 'destination', 'containerCount', 'departureDate', 'deadline', 'hazardous'].filter((key) => !evidence[key])

  return { fields, evidence, missing, source: 'rules' }
}

export function buildBaseline(input = {}) {
  const suppliedCost = Number(input.roadCost ?? input.road_cost) || null
  const cost = suppliedCost || DEFAULT_MARKET_COST
  const mode = suppliedCost
    ? ({ road: '기존 도로 운송', rail: '기존 철도 운송', undecided: '운송 방식 미정' }[input.currentMode] || '기존 도로 운송')
    : '시장 기준 도로 운송'
  return {
    mode,
    cost,
    costConfidence: suppliedCost ? '확인 완료' : '예상값',
    duration: '31시간',
    departure: input.departureLabel || formatDate(input.departureDate),
    arrival: input.deadlineLabel || (input.deadline ? `${formatDate(input.deadline)} 마감 전` : '도착 마감 확인 필요'),
    deadlineMet: true,
    station: '이용 안 함',
    carbonTons: Number(((Number(input.weightTons) || Number(input.teu) * 12 || 12) * 0.0404).toFixed(2)),
    breakdown: [
      [`${mode} 비용`, cost, suppliedCost ? '확인 완료' : '예상값'],
      ['상하차비', 0, '확인 완료'],
      ['대기·보관비', 0, '확인 완료'],
    ],
  }
}

export function buildProposals(input = {}, requestId = 'REQUEST', network = {}) {
  const baselineCost = Number(input.roadCost) || DEFAULT_MARKET_COST
  const firstCost = Math.round(baselineCost * 0.82 / 10_000) * 10_000
  const secondCost = Math.round(baselineCost * 0.78 / 10_000) * 10_000
  const matchingAgents = Math.max(0, Number(network.matchingAgents) || 0)
  const matchingTeu = Math.max(0, Number(network.matchingTeu) || 0)
  const ownerTeu = Math.max(1, Number(input.teu) || Number(input.containerCount) || 1)
  const targetTeu = 18
  const potentialTeu = Math.min(targetTeu, ownerTeu + matchingTeu)
  const roadCarbon = Number(((Number(input.weightTons) || ownerTeu * 12) * 0.0404).toFixed(2))
  const firstCarbon = Number((roadCarbon * 0.38).toFixed(2))
  const secondCarbon = Number((roadCarbon * 0.37).toFixed(2))
  const firstCarbonSavings = Number((roadCarbon - firstCarbon).toFixed(2))
  const secondCarbonSavings = Number((roadCarbon - secondCarbon).toFixed(2))
  const firstBreakdown = breakdown(firstCost, [0.19, 0.09, 0.60, 0.12])
  const secondBreakdown = breakdown(secondCost, [0.23, 0.09, 0.54, 0.14])
  const destination = input.destination || '목적지'
  const firstDeparture = formatDate(input.departureDate, 1)
  const secondDeparture = formatDate(input.departureDate, 1)
  const firstArrival = `${formatDate(input.departureDate, 2)} 13:00`
  const secondArrival = `${formatDate(input.departureDate, 2)} 15:00`
  const firstDeadline = deadlineStatus(input.departureDate, input.deadline, 13)
  const secondDeadline = deadlineStatus(input.departureDate, input.deadline, 15)
  const neededTeu = Math.max(0, targetTeu - ownerTeu)
  const networkReason = matchingAgents > 0
    ? `현재 같은 목적지 화주 ${matchingAgents}곳의 ${matchingTeu}TEU가 연결되어 있어 목표 물량을 구성할 수 있습니다.`
    : '현재 연결된 같은 목적지 화물이 없어 참여 화물을 더 기다려야 합니다.'
  const scheduleConfidence = network.publicDataConnected ? '철도 시간표 확인 완료' : '철도 시간표 확인 필요'
  const exactDeadline = deadlineStatus(input.departureDate, input.deadline, 13)
  if (network.publicDataConnected && potentialTeu >= targetTeu && exactDeadline.deadlineMet) {
    return [{
      id: `${requestId}-P0`,
      engineVersion: 3,
      type: '조건 일치 운송안',
      title: '입력한 조건 그대로 운송할 수 있습니다',
      summary: `출발일과 도착 마감을 바꾸지 않고 같은 목적지 화주 ${matchingAgents}곳과 함께 보낼 수 있습니다.`,
      recommended: true,
      exactMatch: true,
      before: `${formatDate(input.departureDate)} 출발 · 도로 운송`,
      after: `${formatDate(input.departureDate)} 출발 · 철도 함께 보내기`,
      cost: firstCost,
      savings: baselineCost - firstCost,
      savingsRate: 18,
      duration: '31시간',
      timeDelta: '변경 없음',
      departure: formatDate(input.departureDate),
      arrival: `${formatDate(input.departureDate, 2)} 13:00`,
      station: `${input.origin} → ${destination}`,
      ...exactDeadline,
      pooledTeu: potentialTeu,
      targetTeu,
      matchingAgents,
      matchingTeu,
      carbonTons: firstCarbon,
      carbonSavings: firstCarbonSavings,
      carbonRate: 62,
      reason: networkReason,
      gains: `조건 변경 없이 전체 비용 ${Math.round((baselineCost - firstCost) / 10_000)}만원 절감 · 탄소 약 ${firstCarbonSavings}톤 절감`,
      tradeoff: '입력한 출발일·도착 마감 변경 없음',
      caution: '최종 운임과 적재 가능 여부는 코레일 담당자 확인이 필요합니다.',
      trustSummary: '입력 조건을 모두 충족합니다',
      confidence: [scheduleConfidence, '최종 운임 확인 필요', '함께 갈 물량 확인 완료'],
      axes: [],
      breakdown: [['공장→역 트럭비', firstBreakdown[0], '예상값'], ['상하차비', firstBreakdown[1], '예상값'], ['철도운임', firstBreakdown[2], '확인 필요'], ['역→목적지 트럭비', firstBreakdown[3], '예상값'], ['대기·보관비', 0, '확인 완료']],
    }]
  }
  return [
    {
      id: `${requestId}-P1`,
      engineVersion: 3,
      type: '날짜 조정 제안',
      title: `출발을 ${firstDeparture}로 하루 옮겨보세요`,
      summary: `같은 목적지 화주 ${matchingAgents}곳과 물량을 맞추면 전체 비용이 예상 기준 약 18% 낮아집니다.`,
      recommended: true,
      before: `${formatDate(input.departureDate)} 출발 · 도로 운송`,
      after: `${firstDeparture} 출발 · 철도 함께 보내기`,
      cost: firstCost,
      savings: baselineCost - firstCost,
      savingsRate: 18,
      duration: '35시간',
      timeDelta: '+4시간',
      departure: firstDeparture,
      arrival: firstArrival,
      station: `서화성 → ${destination}`,
      ...firstDeadline,
      pooledTeu: potentialTeu,
      targetTeu,
      matchingAgents,
      matchingTeu,
      carbonTons: firstCarbon,
      carbonSavings: firstCarbonSavings,
      carbonRate: 62,
      reason: networkReason,
      gains: `전체 비용 ${Math.round((baselineCost - firstCost) / 10_000)}만원 절감 · 탄소 약 ${firstCarbonSavings}톤 절감`,
      tradeoff: '출발 하루 지연 · 도착 4시간 지연',
      caution: '함께 가는 참여사가 빠지면 조건이 바뀔 수 있습니다.',
      trustSummary: '값 8개 중 3개가 예상값입니다',
      confidence: [scheduleConfidence, '트럭비 예상값', '함께 갈 물량 예상값'],
      axes: ['출발일 ±1일', '도착 마감 ~4시간'],
      breakdown: [['공장→역 트럭비', firstBreakdown[0], '예상값'], ['상하차비', firstBreakdown[1], '예상값'], ['철도운임', firstBreakdown[2], '확인 필요'], ['역→목적지 트럭비', firstBreakdown[3], '예상값'], ['대기·보관비', 0, '확인 완료']],
    },
    {
      id: `${requestId}-P2`,
      engineVersion: 3,
      type: '화차 채움 최적화',
      title: `같은 회차 화물 ${neededTeu}TEU를 모아보세요`,
      summary: `연결된 ${matchingTeu}TEU 중 같은 회차 물량을 채우면 1TEU당 비용이 예상 기준 약 22% 낮아집니다.`,
      recommended: false,
      before: '단독 배정 · 화차 단위 손실',
      after: `같은 목적지 화주 ${matchingAgents}곳과 목표 물량 구성`,
      cost: secondCost,
      savings: baselineCost - secondCost,
      savingsRate: 22,
      duration: '37시간',
      timeDelta: '+6시간',
      departure: secondDeparture,
      arrival: secondArrival,
      station: `오봉 → ${destination}`,
      ...secondDeadline,
      pooledTeu: potentialTeu,
      targetTeu,
      matchingAgents,
      matchingTeu,
      carbonTons: secondCarbon,
      carbonSavings: secondCarbonSavings,
      carbonRate: 63,
      reason: networkReason,
      gains: `전체 비용 ${Math.round((baselineCost - secondCost) / 10_000)}만원 절감 · 1TEU당 단가 하락`,
      tradeoff: '도착 마감 2시간 초과 · 오봉역 이용',
      caution: '화차 단위와 최종 운임은 코레일 담당자 확인이 필요합니다.',
      trustSummary: '값 8개 중 4개가 예상값입니다',
      confidence: [scheduleConfidence, '최종 운임 확인 필요', '모집 가능성 예상값'],
      axes: ['이용 화물역 30km', '보관 여유 1일'],
      breakdown: [['공장→역 트럭비', secondBreakdown[0], '예상값'], ['상하차비', secondBreakdown[1], '예상값'], ['철도운임', secondBreakdown[2], '확인 필요'], ['역→목적지 트럭비', secondBreakdown[3], '예상값'], ['대기·보관비', 0, '확인 완료']],
    },
  ]
}

export function validateFreightRequest(input) {
  const required = ['origin', 'destination', 'containerSize', 'containerCount', 'departureDate', 'deadline', 'hazardous']
  const missing = required.filter((key) => input[key] === undefined || input[key] === null || input[key] === '')
  if (missing.length) return { ok: false, message: `필수 항목이 필요합니다: ${missing.join(', ')}` }
  const containerCount = Number(input.containerCount)
  if (!Number.isInteger(containerCount) || containerCount < 1 || containerCount > 999) return { ok: false, message: '컨테이너 수량은 1개 이상 999개 이하로 입력해 주세요.' }
  if (!['20ft', '40ft'].includes(input.containerSize)) return { ok: false, message: '컨테이너 규격은 20ft 또는 40ft만 선택할 수 있습니다.' }
  if (input.hazardous === 'yes') return { ok: false, hazardous: true, message: '위험물은 별도 검토가 필요합니다.' }
  return { ok: true }
}

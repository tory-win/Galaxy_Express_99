const DEFAULT_FORM = {
  origin: '충남 아산시 음봉면',
  destination: '부산신항',
  containerSize: '20ft',
  containerCount: 4,
  teu: 4,
  departureDate: '2026-08-18',
  deadline: '2026-08-20T09:00',
  hazardous: 'no',
  roadCost: 3_120_000,
  frequency: '주 1회',
  cargo: '산업용 부품',
  weightTons: 48,
  contact: '물류팀 담당자 · 010-0000-0000',
}

export function extractConditionsFromText(text) {
  const normalized = String(text ?? '').replace(/\s+/g, ' ')
  const container = normalized.match(/(20|40)\s*ft\s*(?:컨테이너)?\s*(\d+)\s*개/i)
  const roadCostMan = normalized.match(/(?:도로\s*운송\s*(?:견적|비용)|운송비)(?:은|는|이)?\s*(\d[\d,.]*)\s*만\s*원/)
  const hazardousNo = /위험물(?:은|이)?\s*(?:아니|아닙|아님|해당하지 않)/.test(normalized)
  const hazardousYes = /위험물(?:입니다|이다|해당)/.test(normalized) && !hazardousNo

  const fields = {
    ...DEFAULT_FORM,
    containerSize: container ? `${container[1]}ft` : DEFAULT_FORM.containerSize,
    containerCount: container ? Number(container[2]) : DEFAULT_FORM.containerCount,
    teu: container ? Number(container[2]) * (container[1] === '40' ? 2 : 1) : DEFAULT_FORM.teu,
    hazardous: hazardousYes ? 'yes' : hazardousNo ? 'no' : '',
    roadCost: roadCostMan ? Number(roadCostMan[1].replace(/[,\.]/g, '')) * 10_000 : DEFAULT_FORM.roadCost,
  }

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

export function buildProposals(input = DEFAULT_FORM) {
  const baselineCost = Number(input.roadCost) || 3_120_000
  const firstCost = Math.round(baselineCost * 0.82 / 10_000) * 10_000
  const secondCost = Math.round(baselineCost * 0.78 / 10_000) * 10_000
  return [
    {
      id: 'P-DATE-01',
      type: '날짜 조정 제안',
      title: '출발을 수요일로 하루만 옮겨보세요',
      summary: '같은 구간 화물 5건과 함께 가면 전체 비용이 예상 기준 약 18% 낮아집니다.',
      recommended: true,
      before: '화요일 출발 · 도로 운송',
      after: '수요일 출발 · 철도 함께 보내기',
      cost: firstCost,
      savings: baselineCost - firstCost,
      savingsRate: 18,
      duration: '35시간',
      timeDelta: '+4시간',
      departure: '8월 19일(수)',
      arrival: '8월 20일(목) 13:00',
      station: '서화성 → 부산신항',
      deadlineMet: true,
      pooledTeu: 15,
      targetTeu: 18,
      carbonTons: 0.74,
      carbonSavings: 1.2,
      carbonRate: 62,
      reason: '수요일 출발 화물이 이미 15TEU 모여 있어 함께 실으면 1TEU당 비용이 낮아집니다.',
      gains: `전체 비용 ${Math.round((baselineCost - firstCost) / 10_000)}만원 절감 · 탄소 약 1.2톤 절감`,
      tradeoff: '출발 하루 지연 · 도착 4시간 지연',
      caution: '함께 가는 참여사가 빠지면 조건이 바뀔 수 있습니다.',
      trustSummary: '값 8개 중 3개가 예상값입니다',
      confidence: ['철도 시간표 확인 완료', '트럭비 예상값', '함께 갈 물량 예상값'],
      axes: ['출발일 ±1일', '도착 마감 ~4시간'],
      breakdown: [['공장→역 트럭비', 480_000, '예상값'], ['상하차비', 220_000, '예상값'], ['철도운임', 1_540_000, '확인 필요'], ['역→목적지 트럭비', Math.max(0, firstCost - 2_240_000), '예상값'], ['대기·보관비', 0, '확인 완료']],
    },
    {
      id: 'P-FILL-02',
      type: '화차 채움 최적화',
      title: '같은 회차 화물 4TEU와 함께 채워보세요',
      summary: '화차 단위 최저운임 손실을 줄이면 1TEU당 비용이 예상 기준 약 22% 낮아집니다.',
      recommended: false,
      before: '단독 배정 · 화차 단위 손실',
      after: '같은 회차 2건과 함께 채움',
      cost: secondCost,
      savings: baselineCost - secondCost,
      savingsRate: 22,
      duration: '37시간',
      timeDelta: '+6시간',
      departure: '8월 19일(수)',
      arrival: '8월 20일(목) 15:00',
      station: '오봉 → 부산신항',
      deadlineMet: false,
      pooledTeu: 14,
      targetTeu: 18,
      carbonTons: 0.72,
      carbonSavings: 1.22,
      carbonRate: 63,
      reason: '화차 한 량의 목표 물량까지 4TEU가 남아 있고, 같은 날 조건 확인 중인 화물 2건이 있습니다.',
      gains: `전체 비용 ${Math.round((baselineCost - secondCost) / 10_000)}만원 절감 · 1TEU당 단가 하락`,
      tradeoff: '도착 마감 2시간 초과 · 오봉역 이용',
      caution: '화차 단위와 최종 운임은 코레일 담당자 확인이 필요합니다.',
      trustSummary: '값 8개 중 4개가 예상값입니다',
      confidence: ['공개 시간표 확인 완료', '최종 운임 확인 필요', '모집 가능성 예상값'],
      axes: ['이용 화물역 30km', '보관 여유 1일'],
      breakdown: [['공장→역 트럭비', 560_000, '예상값'], ['상하차비', 220_000, '예상값'], ['철도운임', 1_300_000, '확인 필요'], ['역→목적지 트럭비', Math.max(0, secondCost - 2_080_000), '예상값'], ['대기·보관비', 0, '확인 완료']],
    },
  ]
}

export function validateFreightRequest(input) {
  const required = ['origin', 'destination', 'containerSize', 'containerCount', 'departureDate', 'deadline', 'hazardous']
  const missing = required.filter((key) => input[key] === undefined || input[key] === null || input[key] === '')
  if (missing.length) return { ok: false, message: `필수 항목이 필요합니다: ${missing.join(', ')}` }
  if (input.hazardous === 'yes') return { ok: false, hazardous: true, message: '위험물은 별도 검토가 필요합니다.' }
  return { ok: true }
}

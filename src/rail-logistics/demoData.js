export const DEMO_EMAIL = `제목: 부산신항 산업용 부품 출하 요청

아산 음봉 공장에서 부산신항까지 20ft 컨테이너 4개를 보내려고 합니다.
8월 18일 화요일 출발을 희망하고, 8월 20일 목요일 오전 9시까지 도착해야 합니다.
위험물은 아니며 현재 도로 운송 견적은 312만원입니다.
출발일은 하루 정도 조정할 수 있지만 도착 마감은 4시간 이상 늦어지면 어렵습니다.`

export const DEFAULT_FORM = {
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
  axes: {
    departure: '±1일',
    deadline: '~4시간',
    station: '30km 이내',
    split: '불가',
    rollover: '일부 가능',
    carrier: '기존 유지',
    storage: '1일',
  },
  lockedAxes: ['split'],
}

export const DEMO_REQUEST = {
  id: 'R-2026-0114',
  origin: '충남 서북부',
  destination: '부산신항',
  quantity: '20ft × 4 · 4TEU',
  departureDate: '8월 18일(화)',
  status: 'proposal_ready',
  statusLabel: '역제안 도착 · 2건',
  updatedAt: '방금 전',
}

export const DEMO_POOL_REQUEST = {
  id: 'R-2026-0108',
  origin: '충남 서북부',
  destination: '부산신항',
  quantity: '20ft × 4 · 4TEU',
  departureDate: '8월 19일(수)',
  status: 'pooling',
  statusLabel: '함께 보내기 · 15/18TEU',
  updatedAt: '12분 전',
}

export const BASELINE = {
  mode: '현재 도로 운송',
  cost: 3_120_000,
  duration: '31시간',
  departure: '8월 18일(화)',
  arrival: '8월 19일(수) 16:00',
  deadlineMet: true,
  station: '이용 안 함',
  carbonTons: 1.94,
  breakdown: [
    ['도로 운송비', 3_120_000, '확인 완료'],
    ['상하차비', 0, '확인 완료'],
    ['대기·보관비', 0, '확인 완료'],
  ],
}

export const PROPOSALS = [
  {
    id: 'P-DATE-01',
    type: '날짜 조정 제안',
    title: '출발을 수요일로 하루만 옮겨보세요',
    summary: '같은 구간 화물 5건과 함께 가면 전체 비용이 예상 기준 약 18% 낮아집니다.',
    recommended: true,
    before: '화요일 출발 · 도로 운송',
    after: '수요일 출발 · 철도 함께 보내기',
    cost: 2_560_000,
    savings: 560_000,
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
    gains: '전체 비용 56만원 절감 · 탄소 약 1.2톤 절감',
    tradeoff: '출발 하루 지연 · 도착 4시간 지연',
    caution: '함께 가는 참여사가 빠지면 조건이 바뀔 수 있습니다.',
    trustSummary: '값 8개 중 3개가 예상값입니다',
    confidence: ['철도 시간표 확인 완료', '트럭비 예상값', '함께 갈 물량 예상값'],
    axes: ['출발일 ±1일', '도착 마감 ~4시간'],
    breakdown: [
      ['공장→역 트럭비', 480_000, '예상값'],
      ['상하차비', 220_000, '예상값'],
      ['철도운임', 1_540_000, '확인 필요'],
      ['역→목적지 트럭비', 320_000, '예상값'],
      ['대기·보관비', 0, '확인 완료'],
    ],
  },
  {
    id: 'P-FILL-02',
    type: '화차 채움 최적화',
    title: '같은 회차 화물 4TEU와 함께 채워보세요',
    summary: '화차 단위 최저운임 손실을 줄이면 1TEU당 비용이 예상 기준 약 22% 낮아집니다.',
    recommended: false,
    before: '단독 배정 · 화차 단위 손실',
    after: '같은 회차 2건과 함께 채움',
    cost: 2_430_000,
    savings: 690_000,
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
    gains: '전체 비용 69만원 절감 · 1TEU당 단가 하락',
    tradeoff: '도착 마감 2시간 초과 · 오봉역 이용',
    caution: '화차 단위와 최종 운임은 코레일 담당자 확인이 필요합니다.',
    trustSummary: '값 8개 중 4개가 예상값입니다',
    confidence: ['공개 시간표 확인 완료', '최종 운임 확인 필요', '모집 가능성 예상값'],
    axes: ['이용 화물역 30km', '보관 여유 1일'],
    breakdown: [
      ['공장→역 트럭비', 560_000, '예상값'],
      ['상하차비', 220_000, '예상값'],
      ['철도운임', 1_300_000, '확인 필요'],
      ['역→목적지 트럭비', 350_000, '예상값'],
      ['대기·보관비', 0, '확인 완료'],
    ],
  },
]

export const TIMING_GUIDE = {
  type: '전환 시점 안내',
  title: '이번 조건보다 수요일 회차가 유리합니다',
  body: '화요일 출발을 고정하면 절감 폭이 3% 이내라 조건 변경 부담 대비 이점이 작습니다.',
  conditions: ['출발을 수요일로 조정할 수 있을 때', '함께 가는 물량이 18TEU 이상일 때'],
  reviewAt: '8월 15일 15:00',
}

export const POOL_PARTICIPANTS = [
  { name: '내 화물', region: '충남 서북부', teu: 4, status: '확정', mine: true },
  { name: '참여사 1', region: '충남권', teu: 5, status: '확정' },
  { name: '참여사 2', region: '충남권', teu: 3, status: '확정' },
  { name: '참여사 3', region: '경기 남부', teu: 3, status: '조건 확인 중' },
]

export const REPLACEMENT_PARTICIPANTS = [
  { name: '내 화물', region: '충남 서북부', teu: 4, status: '확정', mine: true },
  { name: '참여사 2', region: '충남권', teu: 4, status: '확정' },
  { name: '참여사 3', region: '경기 남부', teu: 3, status: '조건 확인 중' },
  { name: '새 참여사 4', region: '충남권', teu: 3, status: '확정' },
  { name: '새 참여사 5', region: '충남권', teu: 1, status: '확인 필요' },
]

export const AXIS_OPTIONS = [
  { id: 'departure', label: '출발일', helper: '가장 많은 대안이 여기서 나옵니다', options: ['불가', '±1일', '±2일', '±3일 이상'] },
  { id: 'deadline', label: '도착 마감', helper: '날짜를 안 바꾸고도 해결될 때가 있습니다', options: ['불가', '~4시간', '~12시간', '~1일'] },
  { id: 'station', label: '이용 화물역', helper: '가까운 역이 항상 싼 건 아닙니다', options: ['지정한 곳만', '30km 이내', '전부 비교'] },
  { id: 'split', label: '물량 분할', helper: '전량이 어려워도 일부는 가능할 수 있습니다', options: ['불가', '절반까지', '자유'] },
  { id: 'rollover', label: '회차 이월', helper: '다음 회차와 합칠 수 있습니다', options: ['불가', '일부 가능'] },
  { id: 'carrier', label: '운송사 변경', helper: '기존 운송사 유지안도 찾습니다', options: ['기존 유지', '변경 가능'] },
  { id: 'storage', label: '보관 여유', helper: '잠깐 보관이 되면 선택지가 늘어납니다', options: ['불가', '1일', '2일 이상'] },
]

export function formatWon(value) {
  return `${new Intl.NumberFormat('ko-KR').format(value)}원`
}

export function formatManWon(value) {
  const man = Math.round(value / 10_000)
  return `${new Intl.NumberFormat('ko-KR').format(man)}만원`
}

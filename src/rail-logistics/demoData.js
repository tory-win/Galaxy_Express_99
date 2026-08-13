export const EXAMPLE_EMAIL = `제목: 부산신항 산업용 부품 출하 요청

아산 음봉 공장에서 부산신항까지 20ft 컨테이너 4개를 보내려고 합니다.
8월 18일 화요일 출발을 희망하고, 8월 20일 목요일 오전 9시까지 도착해야 합니다.
위험물은 아니며 현재 도로 운송 견적은 312만원입니다.
출발일은 하루 정도 조정할 수 있지만 도착 마감은 4시간 이상 늦어지면 어렵습니다.`

export const DEFAULT_FORM = {
  origin: '',
  destination: '',
  containerSize: '20ft',
  containerCount: 1,
  teu: 1,
  departureDate: '',
  deadline: '',
  hazardous: '',
  roadCost: null,
  currentMode: 'road',
  frequency: '일회성',
  cargo: '',
  weightTons: 0,
  contact: '',
  axes: {
    departure: '±1일',
    deadline: '~4시간',
    station: '30km 이내',
    split: '불가',
    rollover: '일부 가능',
    carrier: '기존 유지',
    storage: '1일',
  },
}

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

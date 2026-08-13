export const mobilityServices = [
  { id: 'directions', label: '길안내' },
  { id: 'parking', label: '주차·정산' },
  { id: 'airport-bus', label: '공항버스' },
  { id: 'coffee', label: '커피&빵' },
  { id: 'rental', label: '렌터카' },
  { id: 'car-share', label: '카셰어링' },
  { id: 'stay', label: '숙박' },
  { id: 'leisure', label: '레저이용권' },
  { id: 'taxi', label: '관광택시' },
  { id: 'luggage', label: '짐배송' },
  { id: 'rail-delivery', label: '레일택배' },
  {
    id: 'rail-logistics',
    label: '레일물류',
    icon: {
      home: 'service-rail-logistics.svg',
      mobility: 'mobility-rail-logistics.svg',
    },
  },
]

export const travelServices = [
  { id: 'regional', label: '지역별여행' },
  { id: 'tour-train', label: '관광열차' },
  { id: 'railtel', label: '레일텔' },
  { id: 'railship', label: '레일쉽' },
  { id: 'rail-ticket', label: '레일티켓' },
  { id: 'travel-pass', label: '여행패스' },
]

export const ticketFilters = ['전체', '승차권', '이용권', '정기권', 'N카드', '패스']

export const menuTrainRows = [
  { label: '이용 가능 티켓', meta: '승차권·정기권·N카드' },
  { label: '이용 완료 티켓 (지난 이용 내역)' },
  { label: '예약 승차권 조회·취소' },
  { label: '지연료 계좌 반환 신청' },
]

export const menuSupportRows = [
  { label: '공지사항' },
  { label: '고객센터' },
  { label: '앱 설정' },
]

export const SHIPPER_PERSONAS = [
  { region: '충남 서북부', origin: '아산 산업단지', destination: '부산신항', cargoType: '자동차 부품', strategy: '정시 출고', containerSize: '20ft', containerCount: 4, teu: 4, roadCost: 3_080_000, poolRole: 'base' },
  { region: '충남권', origin: '천안 제3산단', destination: '부산신항', cargoType: '전자 부품', strategy: '비용 절감', containerSize: '20ft', containerCount: 3, teu: 3, roadCost: 2_410_000, poolRole: 'base' },
  { region: '경기 남부', origin: '평택 포승단지', destination: '부산신항', cargoType: '산업 장비', strategy: '탄소 절감', containerSize: '20ft', containerCount: 4, teu: 4, roadCost: 3_260_000, poolRole: 'base' },
  { region: '충북권', origin: '청주 오창산단', destination: '부산신항', cargoType: '배터리 소재', strategy: '회차 유연', containerSize: '20ft', containerCount: 3, teu: 3, roadCost: 2_670_000, poolRole: 'flex-a' },
  { region: '대전권', origin: '대전 대덕산단', destination: '부산신항', cargoType: '정밀 기계', strategy: '대체 회차', containerSize: '20ft', containerCount: 3, teu: 3, roadCost: 2_520_000, poolRole: 'flex-b' },
  { region: '전북권', origin: '익산 국가산단', destination: '부산신항', cargoType: '식품 포장재', strategy: '보관 최소화', containerSize: '40ft', containerCount: 1, teu: 2, roadCost: 2_180_000, poolRole: 'network' },
  { region: '경북권', origin: '구미 국가산단', destination: '부산신항', cargoType: '디스플레이 부품', strategy: '납기 우선', containerSize: '20ft', containerCount: 2, teu: 2, roadCost: 1_960_000, poolRole: 'network' },
  { region: '경남권', origin: '창원 국가산단', destination: '의왕 ICD', cargoType: '공작 기계', strategy: '운임 최적화', containerSize: '40ft', containerCount: 2, teu: 4, roadCost: 3_420_000, poolRole: 'network' },
  { region: '전남권', origin: '광양 국가산단', destination: '의왕 ICD', cargoType: '철강 가공품', strategy: '대량 출고', containerSize: '40ft', containerCount: 3, teu: 6, roadCost: 4_760_000, poolRole: 'network' },
  { region: '강원권', origin: '원주 기업도시', destination: '부산신항', cargoType: '의료 기기', strategy: '안전 운송', containerSize: '20ft', containerCount: 2, teu: 2, roadCost: 2_220_000, poolRole: 'network' }
]

export function personaFor(agentId) {
  const index = Number(agentId.slice(-2)) - 1
  const persona = SHIPPER_PERSONAS[index]
  if (!persona) throw new Error(`Unknown shipper persona: ${agentId}`)
  return { ...persona, id: agentId, displayName: `화주 ${agentId.slice(-2)}` }
}


const DATASETS = [
  { id: '15153835', name: '철도거리', resource: 'uddi:f49e02cd-6a65-423e-b773-ddf649267d92' },
  { id: '15042241', name: '화물열차 시간표', resource: 'uddi:7545f0f5-1ae2-4b41-bc1d-de4a011972eb' },
  { id: '15153539', name: '최저운임', resource: 'uddi:69cf6c1d-fbff-4981-a65d-b9e197e14911' },
  { id: '15153571', name: '화물 운임률', resource: 'uddi:8b1350c1-711c-422a-b68d-e4e27ed31509' },
  { id: '15153575', name: '상하역 시간', resource: 'uddi:106d1522-6c05-4f5a-b95d-9fe4c9453361' },
  { id: '15153559', name: '화물역 하역선', resource: 'uddi:a369ea3f-6493-441a-9a5d-b4da591cbeb3' },
]

async function fetchOdcloud(dataset, serviceKey) {
  const url = new URL(`https://api.odcloud.kr/api/${dataset.id}/v1/${dataset.resource}`)
  url.searchParams.set('page', '1')
  url.searchParams.set('perPage', '5')
  url.searchParams.set('serviceKey', serviceKey)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5_000)
  try {
    const response = await fetch(url, { signal: controller.signal })
    return { ok: response.ok, status: response.status, rows: response.ok ? (await response.json()).data?.length ?? 0 : 0 }
  } catch (error) {
    return { ok: false, status: 0, error: error.name === 'AbortError' ? 'timeout' : 'unavailable', rows: 0 }
  } finally {
    clearTimeout(timeout)
  }
}

export async function getPublicDataStatus() {
  const serviceKey = process.env.KORAIL_API_KEY
  if (!serviceKey) {
    return {
      configured: false,
      mode: 'not_configured',
      datasets: DATASETS.map((dataset) => ({ ...dataset, status: 'not_configured' })),
      note: 'API 키는 서버 환경변수에만 설정하며 브라우저나 저장소에 노출하지 않습니다.',
    }
  }

  const results = await Promise.all(DATASETS.map(async (dataset) => {
    const result = await fetchOdcloud(dataset, serviceKey)
    return { id: dataset.id, name: dataset.name, status: result.ok ? 'connected' : 'unavailable', httpStatus: result.status, rows: result.rows }
  }))
  return { configured: true, mode: 'live', datasets: results }
}

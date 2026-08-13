const API_BASE = import.meta.env.VITE_API_BASE_URL || './api/v1'
const OWNED_REQUEST_IDS_KEY = 'railpool:ownedRequestIds'
const runtimeOwnedRequestIds = new Set()

function readOwnedRequestIds() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(OWNED_REQUEST_IDS_KEY) ?? '[]')
    const savedIds = Array.isArray(saved) ? saved.filter((id) => typeof id === 'string') : []
    return [...new Set([...savedIds, ...runtimeOwnedRequestIds])]
  } catch {
    return [...runtimeOwnedRequestIds]
  }
}

function rememberOwnedRequestId(requestId) {
  runtimeOwnedRequestIds.add(requestId)
  try {
    const requestIds = [...new Set([requestId, ...readOwnedRequestIds()])]
    window.localStorage.setItem(OWNED_REQUEST_IDS_KEY, JSON.stringify(requestIds))
  } catch {
    // 저장소가 차단된 환경에서도 요청 생성과 분석은 계속 진행합니다.
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.message || `요청에 실패했습니다 (${response.status})`)
  return payload
}

export async function listFreightRequests() {
  const result = await request('/requests')
  const ownedRequestIds = new Set(readOwnedRequestIds())
  return { ...result, requests: (result.requests ?? []).filter((item) => ownedRequestIds.has(item.id)) }
}
export const getFreightRequest = (requestId) => request(`/requests/${requestId}`)
export const getRailpoolNetwork = () => request('/network')
export const getPoolSnapshot = (requestId) => request(`/pools/${requestId}`)

export function subscribeRailpoolEvents({ onEvent, onConnected, onError }) {
  const source = new EventSource(`${API_BASE}/events`)
  source.onopen = () => onConnected?.()
  source.onmessage = (message) => {
    try {
      onEvent?.(JSON.parse(message.data))
    } catch {
      onError?.(new Error('실시간 상태를 읽지 못했습니다.'))
    }
  }
  source.onerror = () => onError?.(new Error('실시간 연결을 다시 시도하고 있습니다.'))
  return () => source.close()
}

export function extractFreightConditions(text) {
  return request('/extract', { method: 'POST', body: JSON.stringify({ text }) })
}

export async function createAndAnalyzeFreightRequest(form) {
  const created = await request('/requests', { method: 'POST', body: JSON.stringify(form) })
  rememberOwnedRequestId(created.request.id)
  return request(`/requests/${created.request.id}/analyze`, { method: 'POST' })
}

export function saveProposalDecision(requestId, proposalId, decision, reason) {
  return request(`/requests/${requestId}/decisions`, {
    method: 'POST',
    body: JSON.stringify({ proposalId, decision, reason }),
  })
}

export function submitReviewRequest(requestId, payload) {
  return request(`/requests/${requestId}/review`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

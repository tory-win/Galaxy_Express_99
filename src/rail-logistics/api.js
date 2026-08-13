const API_BASE = import.meta.env.VITE_API_BASE_URL || './api/v1'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.message || `요청에 실패했습니다 (${response.status})`)
  return payload
}

export const listFreightRequests = () => request('/requests')
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

import { DEFAULT_FORM, DEMO_REQUEST, PROPOSALS } from './demoData.js'

const API_BASE = import.meta.env.VITE_API_BASE_URL || './api/v1'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.message || `요청에 실패했습니다 (${response.status})`)
  }

  return response.json()
}

export async function listFreightRequests() {
  try {
    const payload = await request('/requests')
    return { ...payload, connected: true }
  } catch {
    return { requests: [DEMO_REQUEST], connected: false }
  }
}

export async function extractFreightConditions(text) {
  try {
    return await request('/extract', {
      method: 'POST',
      body: JSON.stringify({ text }),
    })
  } catch {
    return {
      fields: DEFAULT_FORM,
      evidence: {
        origin: '“아산 음봉 공장에서” 문장에서 인식',
        destination: '“부산신항까지” 문장에서 인식',
        containerCount: '“20ft 컨테이너 4개” 문장에서 인식',
        departureDate: '“8월 18일 화요일 출발” 문장에서 인식',
        deadline: '“8월 20일 목요일 오전 9시까지” 문장에서 인식',
        hazardous: '“위험물은 아니며” 문장에서 인식',
      },
      missing: [],
      source: 'demo-fallback',
    }
  }
}

export async function createAndAnalyzeFreightRequest(form) {
  try {
    const created = await request('/requests', {
      method: 'POST',
      body: JSON.stringify(form),
    })
    const analyzed = await request(`/requests/${created.request.id}/analyze`, { method: 'POST' })
    return { ...analyzed, connected: true }
  } catch {
    return {
      request: { ...DEMO_REQUEST, ...form },
      proposals: PROPOSALS,
      connected: false,
    }
  }
}

export async function saveProposalDecision(requestId, proposalId, decision, reason) {
  try {
    return await request(`/requests/${requestId}/decisions`, {
      method: 'POST',
      body: JSON.stringify({ proposalId, decision, reason }),
    })
  } catch {
    return { ok: true, connected: false }
  }
}

export async function triggerDemoFill(requestId) {
  try {
    return await request(`/requests/${requestId}/demo/fill`, { method: 'POST' })
  } catch {
    return { currentTeu: 18, targetTeu: 18, joinedTeu: 3, connected: false }
  }
}

export async function acceptDisruptionProposal(requestId) {
  try {
    return await request(`/requests/${requestId}/demo/disruption`, { method: 'POST' })
  } catch {
    return { currentTeu: 15, targetTeu: 18, connected: false }
  }
}

export async function submitReviewRequest(requestId, payload) {
  try {
    return await request(`/requests/${requestId}/review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  } catch {
    return { reviewRequest: { id: 'RV-2026-0042', status: 'submitted' }, connected: false }
  }
}

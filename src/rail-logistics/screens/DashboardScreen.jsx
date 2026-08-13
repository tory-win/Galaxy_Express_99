import { DEMO_POOL_REQUEST, DEMO_REQUEST } from '../demoData.js'
import { Icon, PrimaryButton, SectionHeading, StatusPill } from '../components.jsx'

const STATUS_TONE = {
  proposal_ready: 'blue',
  pooling: 'orange',
  review_submitted: 'green',
}

export function DashboardScreen({ requests, onNewRequest, onOpenRequest, onOpenPool, onOpenNotifications }) {
  const displayRequests = requests?.length ? requests : [DEMO_REQUEST, DEMO_POOL_REQUEST]

  return (
    <div className="rp-dashboard">
      <section className="rp-hero-card">
        <div className="rp-hero-card__icon"><Icon name="train" size={29} /></div>
        <span className="rp-kicker">KORAIL · RAILPOOL AI</span>
        <h1>철도가 유리해지는 조건을<br />AI가 먼저 찾아드립니다</h1>
        <p>입력하신 조건 그대로 견적을 내는 대신,<br />같은 구간 화물과 함께 갈 수 있는 방법을 제안합니다.</p>
        <PrimaryButton onClick={onNewRequest}><Icon name="plus" size={16} /> 새 화물 보내기</PrimaryButton>
      </section>

      <SectionHeading title="내 운송 요청" />
      <div className="rp-request-list">
        {displayRequests.slice(0, 2).map((request, index) => {
          const normalized = index === 1 && displayRequests.length === 1 ? DEMO_POOL_REQUEST : request
          const status = normalized.status ?? 'proposal_ready'
          const isPool = status === 'pooling'
          return (
            <button
              type="button"
              className="rp-request-card"
              key={normalized.id}
              onClick={() => isPool ? onOpenPool(normalized) : onOpenRequest(normalized)}
            >
              <div className="rp-request-card__top">
                <span>{normalized.id}</span>
                <StatusPill tone={STATUS_TONE[status] ?? 'blue'}>{normalized.statusLabel ?? '역제안 도착 · 2건'}</StatusPill>
              </div>
              <strong>{normalized.origin ?? '충남 서북부'} <i>→</i> {normalized.destination ?? '부산신항'}</strong>
              <div className="rp-request-card__meta">
                <span>{normalized.quantity ?? '20ft × 4 · 4TEU'}</span>
                <span>{normalized.departureDate ?? '8월 18일(화)'}</span>
                <time>{normalized.updatedAt ?? '방금 전'}</time>
              </div>
            </button>
          )
        })}
        {displayRequests.length < 2 && (
          <button type="button" className="rp-request-card" onClick={() => onOpenPool(DEMO_POOL_REQUEST)}>
            <div className="rp-request-card__top"><span>{DEMO_POOL_REQUEST.id}</span><StatusPill tone="orange">{DEMO_POOL_REQUEST.statusLabel}</StatusPill></div>
            <strong>충남 서북부 <i>→</i> 부산신항</strong>
            <div className="rp-request-card__meta"><span>20ft × 4 · 4TEU</span><span>8월 19일(수)</span><time>12분 전</time></div>
          </button>
        )}
      </div>

      <button type="button" className="rp-alert-card" onClick={onOpenNotifications}>
        <span className="rp-alert-card__icon"><Icon name="alert" size={19} /></span>
        <div><strong>함께 가는 화물에 변동이 생겼어요</strong><small>AI가 고객님 조건을 지키는 새 조합을 찾았습니다.</small></div>
        <b>1</b>
      </button>
    </div>
  )
}

import { Icon, PrimaryButton, SectionHeading, StatusPill } from '../components.jsx'

const STATUS_TONE = {
  proposal_ready: 'blue',
  pooling: 'orange',
  target_reached: 'green',
  review_submitted: 'green',
}

function eventCopy(event) {
  if (!event) return '새 화물이 들어오면 바로 함께 보낼 수 있는 조합을 찾습니다.'
  if (event.type === 'pool_joined') return `${event.payload.region} 화물 ${event.payload.joinedTeu}TEU가 함께 보내기에 참여했습니다.`
  if (event.type === 'pool_left') return `${event.payload.region} 화물 ${event.payload.leftTeu}TEU의 일정이 변경됐습니다.`
  if (event.type === 'request_published') return `${event.payload.region}에서 ${event.payload.destination}행 ${event.payload.teu}TEU가 등록됐습니다.`
  return '함께 보낼 수 있는 화물 조건을 계속 확인하고 있습니다.'
}

export function DashboardScreen({ requests, network, liveStatus, busy, onNewRequest, onOpenRequest, onOpenPool, onOpenNotifications }) {
  const latestEvent = network.recentEvents?.[0]

  return (
    <div className="rp-dashboard">
      <section className="rp-hero-card" aria-labelledby="rail-logistics-start-title">
        <h1 id="rail-logistics-start-title">화물 조건을 등록하고<br />함께 보낼 화물을 찾아보세요</h1>
        <PrimaryButton onClick={onNewRequest}><Icon name="mic" size={18} /> 말하거나 직접 입력해 바로 요청하기</PrimaryButton>
      </section>

      <section className="rp-network-card" aria-label="함께 보내기 네트워크 현황">
        <div className="rp-network-card__top">
          <span className={`rp-network-pulse ${liveStatus === 'live' ? 'is-live' : ''}`} />
          <div><strong>화주 {network.activeAgents}곳이 화물을 찾는 중</strong><small>같은 구간과 날짜가 맞으면 자동으로 함께 보내기에 연결됩니다.</small></div>
          <StatusPill tone={network.activeAgents === network.totalAgents && network.totalAgents > 0 ? 'green' : 'orange'}>{network.activeAgents}/{network.totalAgents}</StatusPill>
        </div>
        <p><Icon name={latestEvent?.type === 'pool_left' ? 'alert' : 'train'} size={15} /> {eventCopy(latestEvent)}</p>
      </section>

      <SectionHeading id="rail-logistics-requests-title" title="내 운송 요청" />
      <section className="rp-request-list" aria-labelledby="rail-logistics-requests-title" aria-busy={busy}>
        {requests.slice(0, 4).map((request) => {
          const isPool = ['pooling', 'target_reached'].includes(request.status)
          return (
            <button type="button" className="rp-request-card" key={request.id} onClick={() => isPool ? onOpenPool(request) : onOpenRequest(request)}>
              <div className="rp-request-card__top"><span>{request.id}</span><StatusPill tone={STATUS_TONE[request.status] ?? 'blue'}>{request.statusLabel}</StatusPill></div>
              <strong>{request.origin} <i>→</i> {request.destination}</strong>
              <div className="rp-request-card__meta"><span>{request.quantity}</span><span>{request.departureDate}</span><time>{request.updatedAt}</time></div>
            </button>
          )
        })}
        {!busy && requests.length === 0 && <div className="rp-empty-state"><Icon name="train" size={24} /><strong>아직 운송 요청이 없습니다</strong><p>화물을 등록하면 함께 보낼 수 있는 조건을 바로 찾습니다.</p></div>}
      </section>

      {latestEvent?.type === 'pool_left' && (
        <button type="button" className="rp-alert-card" onClick={onOpenNotifications}>
          <span className="rp-alert-card__icon"><Icon name="alert" size={19} /></span>
          <div><strong>함께 가는 화물 일정이 바뀌었어요</strong><small>현재 물량과 새 참여 화물을 확인해 주세요.</small></div>
          <b>1</b>
        </button>
      )}
    </div>
  )
}

import { Icon, PrimaryButton, SecondaryButton, StatusPill } from '../components.jsx'

function eventDetails(event) {
  if (event.type === 'pool_joined') return { tone: 'green', icon: 'check', title: `${event.payload.region} 화물 참여`, body: `${event.payload.joinedTeu}TEU가 합류해 현재 ${event.payload.currentTeu}/${event.payload.targetTeu}TEU입니다.` }
  if (event.type === 'pool_left') return { tone: 'orange', icon: 'alert', title: `${event.payload.region} 화물 일정 변경`, body: `${event.payload.leftTeu}TEU가 빠져 현재 ${event.payload.currentTeu}/${event.payload.targetTeu}TEU입니다.` }
  return { tone: 'blue', icon: 'train', title: `${event.payload.region} 신규 화물`, body: `${event.payload.destination}행 ${event.payload.teu}TEU가 등록됐습니다.` }
}

function eventTime(value) {
  return new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value))
}

export function DisruptionScreen({ network, pool, onOpenPool, onLeave }) {
  const events = (network.recentEvents ?? []).filter((event) => ['pool_joined', 'pool_left', 'request_published'].includes(event.type)).slice(0, 8)
  return (
    <div className="rp-disruption-screen">
      <section className="rp-live-summary">
        <span className="rp-network-pulse is-live" />
        <div><strong>화주 {network.activeAgents}곳 연결 중</strong><p>참여와 일정 변경이 생기면 이 화면에 바로 반영됩니다.</p></div>
        <StatusPill tone="green">실시간</StatusPill>
      </section>

      {pool && (
        <section className="rp-impact-card">
          <div className="rp-impact-card__icon"><Icon name="train" size={20} /></div>
          <div><span>현재 함께 보내기</span><h2>{pool.currentTeu}/{pool.targetTeu}TEU</h2><p>{pool.status === 'target_reached' ? '목표 물량을 채워 검토 요청을 보낼 수 있습니다.' : `목표까지 ${pool.targetTeu - pool.currentTeu}TEU 남았습니다.`}</p></div>
        </section>
      )}

      <section className="rp-event-feed" aria-label="최근 화물 변동">
        <div className="rp-section-label"><div><Icon name="alert" size={17} /><strong>최근 변동</strong></div><span>자동 갱신</span></div>
        {events.map((event) => {
          const detail = eventDetails(event)
          return (
            <article key={event.id}>
              <span className={`is-${detail.tone}`}><Icon name={detail.icon} size={16} /></span>
              <div><strong>{detail.title}</strong><p>{detail.body}</p></div>
              <time>{eventTime(event.createdAt)}</time>
            </article>
          )
        })}
        {events.length === 0 && <div className="rp-empty-state"><strong>최근 변동이 없습니다</strong><p>새 화물이 등록되면 바로 알려드립니다.</p></div>}
      </section>

      <div className="rp-recovery-actions"><SecondaryButton onClick={onLeave}>내 운송 목록으로</SecondaryButton><PrimaryButton onClick={onOpenPool}>함께 보내기 현황</PrimaryButton></div>
    </div>
  )
}

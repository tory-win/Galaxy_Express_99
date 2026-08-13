import { useEffect, useRef, useState } from 'react'
import { formatManWon } from '../demoData.js'
import { ConfidenceBadge, Icon, LegalNotice, PrimaryButton, SecondaryButton, StatusPill } from '../components.jsx'

export function PoolScreen({ proposal, pool, network, onReview, onModify, onDisruption, onCancel }) {
  const [flash, setFlash] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const previousTeuRef = useRef(pool.currentTeu)
  const filled = pool.currentTeu >= pool.targetTeu
  const percent = Math.min(100, Math.round((pool.currentTeu / pool.targetTeu) * 100))
  const latestJoin = network.recentEvents?.find((event) => event.requestId === pool.requestId && event.type === 'pool_joined')

  useEffect(() => {
    if (pool.currentTeu <= previousTeuRef.current) {
      previousTeuRef.current = pool.currentTeu
      return undefined
    }
    previousTeuRef.current = pool.currentTeu
    setFlash(true)
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      document.querySelector('.rp-screen-body')?.scrollTo({ top: 0, behavior: 'auto' })
    })
    const timer = window.setTimeout(() => setFlash(false), 1800)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [pool.currentTeu])

  const ownerTeu = pool.participants.find((participant) => participant.mine)?.teu ?? 0
  const estimatedTotal = pool.unitCost * ownerTeu

  return (
    <div className="rp-pool-screen">
      <section className={`rp-pool-progress ${flash ? 'is-flashing' : ''}`}>
        <div className="rp-pool-progress__top"><div><span>함께 보내기 현황</span><h1>{filled ? '목표 물량을 채웠어요' : `${pool.targetTeu - pool.currentTeu}TEU만 더 모이면 확정`}</h1></div><StatusPill tone={filled ? 'green' : 'orange'}>{filled ? '목표 달성' : '모집 중'}</StatusPill></div>
        <div className="rp-progress-numbers"><strong>{pool.currentTeu}<small>TEU</small></strong><span>/ 목표 {pool.targetTeu}TEU · {percent}%</span></div>
        <div className="rp-progress-track" role="progressbar" aria-label="함께 보내기 모집 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent} aria-valuetext={`${pool.currentTeu}TEU / 목표 ${pool.targetTeu}TEU`}><i style={{ width: `${percent}%` }} /></div>
        <div className="rp-countdown"><span>화주 네트워크</span><strong>{network.activeAgents}곳에서 실시간 확인 중</strong></div>
      </section>

      {flash && latestJoin && <div className="rp-success-banner"><span><Icon name="check" size={18} /></span><div><strong>{latestJoin.payload.region} 화물 {latestJoin.payload.joinedTeu}TEU가 합류했습니다</strong><small>현재 조합과 1TEU당 예상 단가를 다시 계산했습니다.</small></div></div>}

      <section className="rp-pool-economics">
        <div><span>내 예상 전체 비용</span><strong>{formatManWon(estimatedTotal)}</strong><small><ConfidenceBadge kind="예상값" compact /> 현재 조합 기준</small></div>
        <i />
        <div><span>1TEU당 예상 단가</span><strong>{formatManWon(pool.unitCost)}</strong><small className="is-positive">{filled ? '목표 물량 기준 단가' : '물량이 늘면 더 낮아집니다'}</small></div>
      </section>

      <section className="rp-participant-section">
        <div className="rp-section-label"><div><Icon name="people" size={17} /><strong>함께 가는 화물</strong></div><span>{pool.participants.length}건 · 전부 익명</span></div>
        <div className="rp-participant-list">
          {pool.participants.map((participant) => (
            <article key={participant.id} className={participant.mine ? 'is-mine' : ''}>
              <div className="rp-avatar">{participant.mine ? 'ME' : participant.agentId?.slice(-2) ?? '+'}</div>
              <div><strong>{participant.name}{participant.mine && <StatusPill tone="blue">내 화물</StatusPill>}</strong><small>{participant.region} · 상세 품목 비공개</small></div>
              <div className="rp-participant-amount"><strong>{participant.teu}TEU</strong><small>{participant.status}</small></div>
            </article>
          ))}
        </div>
        <p className="rp-privacy-note">회사명·품목·상세 주소·운임은 다른 참여사에게 공개되지 않습니다.</p>
      </section>

      <section className="rp-plan-summary">
        <div><span>출발</span><strong>{proposal.departure}</strong></div><div><span>화물역</span><strong>{proposal.station}</strong></div><div><span>도착 예정</span><strong>{proposal.arrival}</strong></div><div><span>열차 여유</span><strong>코레일 확인 필요</strong></div>
      </section>

      <section className="rp-notification-settings">
        <div><Icon name="alert" size={18} /><div><strong>모집 알림</strong><p>참여·이탈, 목표 달성, 코레일 확인 결과를 푸시로 알려드립니다.</p></div></div>
        <button type="button" role="switch" aria-checked={notifications} onClick={() => setNotifications((value) => !value)}>{notifications ? '푸시 알림 켜짐' : '푸시 알림 꺼짐'}</button>
        <small>모집 판단 마감: 출발 48시간 전 · 목표 미달 사전 알림: 72시간 전 · 긴급 요청은 등록 즉시 2시간 간격으로 상황을 안내합니다.</small>
      </section>

      <p className="rp-no-charge"><Icon name="check" size={14} /> 목표 물량에 미달하면 자동 취소되며 비용은 발생하지 않습니다.</p>
      <button type="button" className="rp-disruption-link" onClick={onDisruption}><Icon name="alert" size={16} /> 최근 참여·이탈 내역 보기</button>

      <div className="rp-pool-actions"><PrimaryButton disabled={!filled} onClick={onReview}>{filled ? '코레일에 검토 요청 보내기' : `목표 달성까지 ${pool.targetTeu - pool.currentTeu}TEU 남음`}</PrimaryButton><SecondaryButton onClick={onModify}>내 조건 수정</SecondaryButton><button type="button" className="rp-cancel-button" onClick={onCancel}>이 계획 취소하기</button></div>
      <LegalNotice />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { POOL_PARTICIPANTS, formatManWon } from '../demoData.js'
import { ConfidenceBadge, Icon, LegalNotice, PrimaryButton, SecondaryButton, StatusPill } from '../components.jsx'

export function PoolScreen({ proposal, currentTeu, targetTeu, onFill, onReview, onModify, onDisruption, busy }) {
  const [flash, setFlash] = useState(false)
  const filled = currentTeu >= targetTeu
  const percent = Math.min(100, Math.round((currentTeu / targetTeu) * 100))
  const participants = filled
    ? [...POOL_PARTICIPANTS, { name: '새 참여사 4', region: '충남권', teu: 3, status: '방금 참여' }]
    : POOL_PARTICIPANTS

  useEffect(() => {
    if (!filled) return undefined
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
  }, [filled])

  return (
    <div className="rp-pool-screen">
      <section className={`rp-pool-progress ${flash ? 'is-flashing' : ''}`}>
        <div className="rp-pool-progress__top"><div><span>함께 보내기 현황</span><h1>{filled ? '목표 물량을 채웠어요' : `${targetTeu - currentTeu}TEU만 더 모이면 확정`}</h1></div><StatusPill tone={filled ? 'green' : 'orange'}>{filled ? '목표 달성' : '모집 중'}</StatusPill></div>
        <div className="rp-progress-numbers"><strong>{currentTeu}<small>TEU</small></strong><span>/ 목표 {targetTeu}TEU · {percent}%</span></div>
        <div className="rp-progress-track" role="progressbar" aria-label="함께 보내기 모집 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent} aria-valuetext={`${currentTeu}TEU / 목표 ${targetTeu}TEU`}><i style={{ width: `${percent}%` }} /></div>
        <div className="rp-countdown"><span>모집 마감</span><strong>18시간 42분 남음</strong></div>
      </section>

      {filled && <div className="rp-success-banner"><span><Icon name="check" size={18} /></span><div><strong>새 참여사 3TEU가 합류했습니다</strong><small>화차 한 량이 채워져 참여사 모두의 1TEU당 예상 단가가 낮아졌습니다.</small></div></div>}

      <section className="rp-pool-economics">
        <div><span>내 예상 전체 비용</span><strong>{formatManWon(filled ? 2_430_000 : proposal.cost)}</strong><small><ConfidenceBadge kind="예상값" compact /> {filled ? '목표 달성 후 −22%' : '현재 조합 −18%'}</small></div>
        <i />
        <div><span>1TEU당 예상 단가</span><strong>{formatManWon(filled ? 607_500 : 640_000)}</strong><small className="is-positive">{filled ? '32,500원 더 낮아짐' : '목표 달성 시 더 낮아짐'}</small></div>
      </section>

      <section className="rp-participant-section">
        <div className="rp-section-label"><div><Icon name="people" size={17} /><strong>함께 가는 화물</strong></div><span>{participants.length}건 · 전부 익명</span></div>
        <div className="rp-participant-list">
          {participants.map((participant) => (
            <article key={`${participant.name}-${participant.teu}`} className={participant.mine ? 'is-mine' : participant.status === '방금 참여' ? 'is-new' : ''}>
              <div className="rp-avatar">{participant.mine ? 'ME' : participant.name.replace(/\D/g, '') || '+'}</div>
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

      <p className="rp-no-charge"><Icon name="check" size={14} /> 목표 물량에 미달하면 자동 취소되며 비용은 발생하지 않습니다.</p>

      {!filled && <button type="button" className="rp-demo-action" disabled={busy} onClick={onFill}><span>DEMO</span><div><strong>B사 3TEU 등록 시연</strong><small>화차가 채워지며 단가가 내려가는 장면</small></div><b>실행</b></button>}
      <button type="button" className="rp-disruption-link" onClick={onDisruption}><Icon name="alert" size={16} /> 참여사 이탈·AI 재제안 시연 보기</button>

      <div className="rp-pool-actions"><PrimaryButton disabled={!filled} onClick={onReview}>{filled ? '코레일에 검토 요청 보내기' : `목표 달성까지 ${targetTeu - currentTeu}TEU 남음`}</PrimaryButton><SecondaryButton onClick={onModify}>내 조건 수정</SecondaryButton></div>
      <LegalNotice />
    </div>
  )
}

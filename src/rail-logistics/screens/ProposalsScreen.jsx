import { useEffect, useRef, useState } from 'react'
import { formatManWon } from '../demoData.js'
import { ConfidenceBadge, Icon, LegalNotice, PrimaryButton, SecondaryButton, StatusPill } from '../components.jsx'

const REJECTION_REASONS = [
  '출발일 변경 불가',
  '도착 지연 불가',
  '화물역 변경 불가',
  '물량 분할 불가',
  '다음 회차 이용 불가',
  '운송사 변경 불가',
  '보관 여유 없음',
]

function ProposalCard({ proposal, baseline, onProceed, onCompare, onReject }) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  return (
    <article className={`rp-proposal-card ${proposal.recommended ? 'is-recommended' : ''}`}>
      {proposal.recommended && <span className="rp-recommend-ribbon"><Icon name="check" size={12} /> 추천</span>}
      <div className="rp-proposal-card__type"><StatusPill tone={proposal.recommended ? 'blue' : 'soft'}>{proposal.type}</StatusPill><small>{proposal.trustSummary}</small></div>
      <h2>{proposal.title}</h2>
      <p className="rp-proposal-card__summary">{proposal.summary}</p>
      <div className="rp-change-line"><span>{proposal.before}</span><i>→</i><strong>{proposal.after}</strong></div>

      <div className="rp-proposal-metrics">
        <div className="is-positive"><span>전체 비용 <ConfidenceBadge kind="예상값" compact /></span><strong>{formatManWon(baseline.cost)} <i>→</i> {formatManWon(proposal.cost)}</strong><b>−{formatManWon(proposal.savings)} · −{proposal.savingsRate}%</b></div>
        <div className="is-tradeoff"><span>전체 시간 <ConfidenceBadge kind="예상값" compact /></span><strong>{baseline.duration} <i>→</i> {proposal.duration}</strong><b>{proposal.timeDelta}</b></div>
      </div>

      <div className="rp-carbon-row"><Icon name="leaf" size={16} /><div><strong>탄소 약 {proposal.carbonSavings}톤 CO₂ 절감 · −{proposal.carbonRate}%</strong><small><ConfidenceBadge kind="예상값" compact /> 전환교통 지원사업 대상 요건에 해당할 수 있음 · 사전 협약 필요</small></div></div>

      <dl className="rp-proposal-facts">
        <div><dt>이 제안이 유리한 이유</dt><dd>{proposal.reason}</dd></div>
        <div><dt>얻는 것</dt><dd className="is-gain">{proposal.gains}</dd></div>
        <div><dt>감수할 것</dt><dd className="is-loss">{proposal.tradeoff}</dd></div>
        <div><dt>주의</dt><dd>{proposal.caution}</dd></div>
      </dl>

      <div className="rp-confidence-row">{proposal.confidence.map((item) => <ConfidenceBadge key={item} kind={item.includes('확인 필요') ? '확인 필요' : item.includes('예상값') ? '예상값' : '확인 완료'} />)}</div>

      <button type="button" className="rp-details-toggle" aria-expanded={detailsOpen} aria-controls={`breakdown-${proposal.id}`} onClick={() => setDetailsOpen((open) => !open)}>{detailsOpen ? '계산 근거 접기' : '계산 근거 펼쳐보기'} <span>{detailsOpen ? '⌃' : '⌄'}</span></button>
      {detailsOpen && (
        <div className="rp-breakdown" id={`breakdown-${proposal.id}`}>
          {proposal.breakdown.map(([label, value, confidence]) => <div key={label}><span>{label}</span><strong>{formatManWon(value)} <ConfidenceBadge kind={confidence} compact /></strong></div>)}
          <p>철도 거리·시간표는 공공데이터 기준이며, 실제 운임과 적재 가능 여부는 코레일 확인 후 확정됩니다.</p>
        </div>
      )}

      <div className="rp-proposal-actions"><PrimaryButton onClick={() => onProceed(proposal)}>추천안 적용하기</PrimaryButton><SecondaryButton onClick={() => onReject(proposal)}>거절하고 다른 제안 보기</SecondaryButton><button type="button" className="rp-text-button" onClick={() => onCompare(proposal)}>원래 계획과 상세 비교</button></div>
    </article>
  )
}

export function ProposalsScreen({ baseline, proposals, onProceed, onCompare, onReject, onModify }) {
  const [rejecting, setRejecting] = useState(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const modalRef = useRef(null)
  const swipeStartRef = useRef(null)
  const previousFocusRef = useRef(null)
  const leadProposal = proposals[0]
  const activeProposal = proposals[Math.min(activeIndex, proposals.length - 1)]

  useEffect(() => setActiveIndex((index) => Math.min(index, proposals.length - 1)), [proposals.length])

  useEffect(() => {
    if (!rejecting) return undefined
    previousFocusRef.current = document.activeElement
    const frame = window.requestAnimationFrame(() => modalRef.current?.querySelector('button')?.focus())
    return () => {
      window.cancelAnimationFrame(frame)
      previousFocusRef.current?.focus()
    }
  }, [rejecting])

  const handleModalKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setRejecting(null)
      return
    }
    if (event.key !== 'Tab') return
    const focusable = [...(modalRef.current?.querySelectorAll('button:not([disabled])') ?? [])]
    const first = focusable[0]
    const last = focusable.at(-1)
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  const chooseReason = (reason) => {
    onReject(rejecting, reason)
    setActiveIndex(0)
    setRejecting(null)
  }

  const handleSwipeStart = (event) => {
    swipeStartRef.current = event.touches?.[0]?.clientX ?? event.clientX
  }

  const handleSwipeEnd = (event) => {
    if (swipeStartRef.current === null) return
    const end = event.changedTouches?.[0]?.clientX ?? event.clientX
    const distance = end - swipeStartRef.current
    swipeStartRef.current = null
    if (Math.abs(distance) < 48) return
    setActiveIndex((index) => distance < 0 ? Math.min(proposals.length - 1, index + 1) : Math.max(0, index - 1))
  }

  return (
    <div className="rp-proposals-screen">
      <section className="rp-proposal-opening">
        <span><Icon name="train" size={18} /></span>
        <div><small>운송 제안</small><h1>현재 계획보다<br />{formatManWon(leadProposal.savings)} 낮은 방법이 있습니다.</h1><p>{leadProposal.tradeoff}. 아래에서 비용과 일정 차이를 확인해 주세요.</p></div>
      </section>

      <section className="rp-baseline-card">
        <div><span>내 원래 계획 · 기준선</span><ConfidenceBadge kind={baseline.costConfidence || '예상값'} /></div>
        <strong>{baseline.mode}</strong>
        <dl><div><dt>전체 비용</dt><dd>{formatManWon(baseline.cost)}</dd></div><div><dt>전체 시간</dt><dd>{baseline.duration}</dd></div><div><dt>도착 예정</dt><dd>{baseline.arrival}</dd></div></dl>
      </section>

      <nav className="rp-proposal-switcher" aria-label="AI 역제안 빠른 선택">
        {proposals.map((proposal, index) => (
          <button type="button" key={proposal.id} aria-current={index === activeIndex ? 'true' : undefined} className={index === activeIndex ? 'is-active' : ''} onClick={() => setActiveIndex(index)}>
            <small>대안 {index + 1}</small><strong>{proposal.type.replace(' 제안', '')}</strong><span>−{formatManWon(proposal.savings)}</span>
          </button>
        ))}
      </nav>
      <p className="rp-swipe-hint" aria-live="polite"><span>{activeIndex + 1} / {proposals.length}</span> 좌우로 밀어 다른 제안 보기</p>

      <div className="rp-proposal-stack" onTouchStart={handleSwipeStart} onTouchEnd={handleSwipeEnd}>
        <ProposalCard key={activeProposal.id} proposal={activeProposal} baseline={baseline} onProceed={onProceed} onCompare={onCompare} onReject={setRejecting} />
      </div>

      <button type="button" className="rp-modify-link" onClick={onModify}>검토 범위 다시 설정하기</button>
      <LegalNotice />

      {rejecting && (
        <div className="rp-modal-layer" role="presentation" onMouseDown={() => setRejecting(null)}>
          <section ref={modalRef} className="rp-modal" role="dialog" aria-modal="true" aria-labelledby="reject-title" aria-describedby="reject-description" onKeyDown={handleModalKeyDown} onMouseDown={(event) => event.stopPropagation()}>
            <i className="rp-sheet-handle" />
            <button type="button" className="rp-modal-close" aria-label="거절 사유 선택 닫기" onClick={() => setRejecting(null)}>×</button>
            <span className="rp-modal__step">다음 제안을 더 정확하게 찾을게요</span>
            <h2 id="reject-title">어떤 조건을 바꾸기 힘드신가요?</h2>
            <p id="reject-description">선택한 내용을 반영해 다른 조합을 다시 계산합니다.</p>
            <div className="rp-reason-grid">{REJECTION_REASONS.map((reason) => <button type="button" key={reason} onClick={() => chooseReason(reason)}>{reason}</button>)}</div>
          </section>
        </div>
      )}
    </div>
  )
}

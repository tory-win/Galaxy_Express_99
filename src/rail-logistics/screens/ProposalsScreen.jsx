import { useEffect, useRef, useState } from 'react'
import { formatManWon } from '../demoData.js'
import { ConfidenceBadge, Icon, LegalNotice, PrimaryButton, SecondaryButton, StatusPill } from '../components.jsx'

const REJECTION_REASONS = [
  '출발일을 못 바꿔요',
  '도착이 늦으면 안 돼요',
  '화물역을 바꿀 수 없어요',
  '물량을 나눌 수 없어요',
  '다음 회차로 못 미뤄요',
  '운송사를 바꿀 수 없어요',
  '보관 여유가 없어요',
  '그냥 다른 안을 보고 싶어요',
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

      <div className="rp-proposal-actions"><PrimaryButton onClick={() => onProceed(proposal)}>이 제안으로 진행</PrimaryButton><SecondaryButton onClick={() => onReject(proposal)}>거절하고 다른 제안 보기</SecondaryButton><button type="button" className="rp-text-button" onClick={() => onCompare(proposal)}>이 안을 기준으로 비교</button></div>
    </article>
  )
}

export function ProposalsScreen({ baseline, proposals, onProceed, onCompare, onReject, onModify }) {
  const [rejecting, setRejecting] = useState(null)
  const modalRef = useRef(null)
  const previousFocusRef = useRef(null)
  const leadProposal = proposals[0]

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
    setRejecting(null)
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

      <div className="rp-proposal-stack">{proposals.map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} baseline={baseline} onProceed={onProceed} onCompare={onCompare} onReject={setRejecting} />)}</div>

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

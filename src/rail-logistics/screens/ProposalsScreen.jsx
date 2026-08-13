import { useState } from 'react'
import { BASELINE, TIMING_GUIDE, formatManWon } from '../demoData.js'
import { ConfidenceBadge, Icon, LegalNotice, PrimaryButton, SecondaryButton, StatusPill } from '../components.jsx'

const REJECTION_REASONS = [
  '출발일을 못 바꿔요',
  '도착이 늦으면 안 돼요',
  '화물역 변경이 어려워요',
  '물량을 나눌 수 없어요',
  '다음 회차로 못 미뤄요',
  '운송사를 바꿀 수 없어요',
  '보관 여유가 없어요',
  '그냥 다른 안을 보고 싶어요',
]

function ProposalCard({ proposal, onProceed, onCompare, onReject }) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  return (
    <article className={`rp-proposal-card ${proposal.recommended ? 'is-recommended' : ''}`}>
      {proposal.recommended && <span className="rp-recommend-ribbon"><Icon name="spark" size={12} /> 추천</span>}
      <div className="rp-proposal-card__type"><StatusPill tone={proposal.recommended ? 'blue' : 'soft'}>{proposal.type}</StatusPill><small>{proposal.trustSummary}</small></div>
      <h2>{proposal.title}</h2>
      <p className="rp-proposal-card__summary">{proposal.summary}</p>
      <div className="rp-change-line"><span>{proposal.before}</span><i>→</i><strong>{proposal.after}</strong></div>

      <div className="rp-proposal-metrics">
        <div className="is-positive"><span>전체 비용 <ConfidenceBadge kind="예상값" compact /></span><strong>{formatManWon(BASELINE.cost)} <i>→</i> {formatManWon(proposal.cost)}</strong><b>−{formatManWon(proposal.savings)} · −{proposal.savingsRate}%</b></div>
        <div className="is-tradeoff"><span>전체 시간 <ConfidenceBadge kind="예상값" compact /></span><strong>{BASELINE.duration} <i>→</i> {proposal.duration}</strong><b>{proposal.timeDelta}</b></div>
      </div>

      <div className="rp-carbon-row"><Icon name="leaf" size={16} /><div><strong>탄소 약 {proposal.carbonSavings}톤 CO₂ 절감 · −{proposal.carbonRate}%</strong><small><ConfidenceBadge kind="예상값" compact /> 전환교통 지원사업 대상 요건에 해당할 수 있음 · 사전 협약 필요</small></div></div>

      <dl className="rp-proposal-facts">
        <div><dt>AI가 이 안을 찾은 이유</dt><dd>{proposal.reason}</dd></div>
        <div><dt>얻는 것</dt><dd className="is-gain">{proposal.gains}</dd></div>
        <div><dt>감수할 것</dt><dd className="is-loss">{proposal.tradeoff}</dd></div>
        <div><dt>주의</dt><dd>{proposal.caution}</dd></div>
      </dl>

      <div className="rp-confidence-row">{proposal.confidence.map((item) => <ConfidenceBadge key={item} kind={item.includes('확인 필요') ? '확인 필요' : item.includes('예상값') ? '예상값' : '확인 완료'} />)}</div>

      <button type="button" className="rp-details-toggle" onClick={() => setDetailsOpen((open) => !open)}>{detailsOpen ? '계산 근거 접기' : '계산 근거 펼쳐보기'} <span>{detailsOpen ? '⌃' : '⌄'}</span></button>
      {detailsOpen && (
        <div className="rp-breakdown">
          {proposal.breakdown.map(([label, value, confidence]) => <div key={label}><span>{label}</span><strong>{formatManWon(value)} <ConfidenceBadge kind={confidence} compact /></strong></div>)}
          <p>철도 거리·시간표는 공공데이터 기준이며, 실제 운임과 적재 가능 여부는 코레일 확인 후 확정됩니다.</p>
        </div>
      )}

      <div className="rp-proposal-actions"><PrimaryButton onClick={() => onProceed(proposal)}>이 제안으로 진행</PrimaryButton><SecondaryButton onClick={() => onReject(proposal)}>거절하고 다른 제안 보기</SecondaryButton><button type="button" className="rp-text-button" onClick={() => onCompare(proposal)}>이 안을 기준으로 비교</button></div>
    </article>
  )
}

export function ProposalsScreen({ proposals, sourceCount, onProceed, onCompare, onReject, onModify }) {
  const [rejecting, setRejecting] = useState(null)
  const [round, setRound] = useState(1)

  const chooseReason = (reason) => {
    onReject(rejecting, reason)
    setRejecting(null)
    setRound((value) => Math.min(3, value + 1))
  }

  return (
    <div className="rp-proposals-screen">
      <section className="rp-ai-opening">
        <span><Icon name="spark" size={18} /></span>
        <div><small>RAILPOOL AI · {round}차 제안</small><h1>출발일을 하루만 옮기시면<br />전체 비용이 약 18% 낮아집니다.</h1><p>대신 도착이 4시간 늦어집니다. 좋은 점과 불편한 점을 같은 기준으로 보여드릴게요.</p></div>
      </section>

      <div className={`rp-source-banner ${sourceCount > 0 ? 'is-live' : ''}`}>
        <span><Icon name="check" size={13} /></span>
        <div><strong>{sourceCount > 0 ? `KORAIL·ODCloud 공공데이터 ${sourceCount}종 연결` : '가상 데이터 기준 분석'}</strong><small>{sourceCount > 0 ? '거리·시간표·최저운임·임율·적하시간·작업선 조회 완료' : '실데이터 연결 전에는 모든 수치를 예상값으로 표시합니다'}</small></div>
        <ConfidenceBadge kind={sourceCount > 0 ? '확인 완료' : '예상값'} compact />
      </div>

      <section className="rp-baseline-card">
        <div><span>내 원래 계획 · 기준선</span><ConfidenceBadge kind="확인 완료" /></div>
        <strong>{BASELINE.mode}</strong>
        <dl><div><dt>전체 비용</dt><dd>{formatManWon(BASELINE.cost)}</dd></div><div><dt>전체 시간</dt><dd>{BASELINE.duration}</dd></div><div><dt>도착 예정</dt><dd>{BASELINE.arrival}</dd></div></dl>
      </section>

      <div className="rp-proposal-stack">{proposals.map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} onProceed={onProceed} onCompare={onCompare} onReject={setRejecting} />)}</div>

      <section className="rp-timing-guide">
        <div><StatusPill tone="blue">{TIMING_GUIDE.type}</StatusPill><small>효과가 작을 때 숨기지 않습니다</small></div>
        <h2>{TIMING_GUIDE.title}</h2><p>{TIMING_GUIDE.body}</p>
        <ul>{TIMING_GUIDE.conditions.map((condition) => <li key={condition}><Icon name="check" size={13} />{condition}</li>)}</ul>
        <button type="button">이 조건이 되면 알려주기 <span>{TIMING_GUIDE.reviewAt} 재검토</span></button>
      </section>

      <button type="button" className="rp-modify-link" onClick={onModify}>열어둔 조정 축 수정하기</button>
      <LegalNotice />

      {rejecting && (
        <div className="rp-modal-layer" role="presentation" onMouseDown={() => setRejecting(null)}>
          <section className="rp-modal" role="dialog" aria-modal="true" aria-labelledby="reject-title" onMouseDown={(event) => event.stopPropagation()}>
            <i className="rp-sheet-handle" />
            <span className="rp-modal__step">다음 제안을 더 정확하게 찾을게요</span>
            <h2 id="reject-title">어떤 점이 어려우셨나요?</h2>
            <p>선택한 조건은 잠그고, 남은 범위 안에서 다시 계산합니다.</p>
            <div className="rp-reason-grid">{REJECTION_REASONS.map((reason) => <button type="button" key={reason} onClick={() => chooseReason(reason)}>{reason}</button>)}</div>
          </section>
        </div>
      )}
    </div>
  )
}

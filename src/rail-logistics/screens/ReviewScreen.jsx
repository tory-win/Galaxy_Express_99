import { useEffect, useState } from 'react'
import { formatManWon } from '../demoData.js'
import { ConfidenceBadge, Icon, LegalNotice, PrimaryButton, SecondaryButton, StatusPill } from '../components.jsx'

function ReviewSection({ title, badge, children, open = false }) {
  return <details className="rp-review-section" open={open}><summary><strong>{title}</strong>{badge}<span>⌄</span></summary><div>{children}</div></details>
}

export function ReviewScreen({ requestId, requestInput, pool, proposal, onSubmit, onDone, busy }) {
  const [submitted, setSubmitted] = useState(false)
  const [reviewId, setReviewId] = useState('')

  useEffect(() => {
    if (submitted) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      document.querySelector('.rp-screen-body')?.scrollTo({ top: 0, behavior: 'auto' })
    }
  }, [submitted])

  const submit = async () => {
    const result = await onSubmit({ requestId, proposalId: proposal.id })
    setReviewId(result.reviewRequest?.id ?? '')
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="rp-review-complete">
        <span className="rp-complete-mark"><Icon name="check" size={34} /></span>
        <small>코레일 물류 담당자에게 전달 완료</small>
        <h1>검토 요청이 전달되었습니다</h1>
        <p>이 요청은 예약이나 계약이 아닙니다.<br />영업일 기준 1~2일 내 담당자가 연락드립니다.</p>
        <div className="rp-review-number"><span>검토 요청 번호</span><strong>{reviewId}</strong><small>문의하실 때 이 번호를 알려주세요.</small></div>
        <section className="rp-alimtalk-preview" aria-label="가상 코레일톡 알림톡">
          <div className="rp-alimtalk-preview__head"><span>K</span><div><strong>코레일톡 알림톡</strong><small>시연용 · 실제 발송되지 않음</small></div><StatusPill tone="green">접수 완료</StatusPill></div>
          <p><strong>[레일물류] 검토 요청이 접수되었습니다.</strong><br />요청 번호 {reviewId}<br />진행 상황이 변경되거나 운송 조건이 확정되면 같은 채널로 알려드립니다.</p>
        </section>
        <section className="rp-next-steps"><strong>다음 절차</strong><ol><li><i>1</i><span>코레일 담당자가 운임·적재 가능 여부를 확인합니다.</span></li><li><i>2</i><span>담당자가 등록된 연락처로 조건을 회신합니다.</span></li><li><i>3</i><span>회신 후 별도 운송 계약을 검토합니다.</span></li></ol></section>
        <section className="rp-review-notice"><strong>진행 상황도 코레일톡 알림톡으로 알려드려요</strong><p>담당자 배정, 추가 정보 요청, 운임·적재 확인 완료와 최종 확정을 단계별로 알립니다. 현재는 해커톤 시연용이며 실제 카카오톡 메시지는 발송하지 않습니다.</p></section>
        <PrimaryButton onClick={onDone}>내 운송 목록으로</PrimaryButton>
      </div>
    )
  }

  return (
    <div className="rp-review-screen">
      <section className="rp-review-warning"><span><Icon name="alert" size={20} /></span><div><strong>이 단계는 예약이 아닙니다</strong><p>아래 조건을 코레일 담당자에게 보내 실제 운송 가능 여부와 운임을 검토 요청합니다.</p></div></section>

      <div className="rp-review-meta"><span>요청 번호</span><strong>{requestId}</strong><StatusPill tone="soft">보내기 전</StatusPill></div>

      <ReviewSection title="운송 조건" badge={<ConfidenceBadge kind="확인 완료" />} open>
        <dl className="rp-review-list"><div><dt>구간</dt><dd>{requestInput.origin} → {requestInput.destination}</dd></div><div><dt>출발·도착</dt><dd>{proposal.departure} → {proposal.arrival}</dd></div><div><dt>화물역</dt><dd>{proposal.station}</dd></div><div><dt>내 물량</dt><dd>{requestInput.containerSize} × {requestInput.containerCount} · {requestInput.teu}TEU · {requestInput.cargo}</dd></div><div><dt>위험물</dt><dd>아님 · 사용자 확인</dd></div><div><dt>함께 가는 총 물량</dt><dd>{pool?.currentTeu ?? proposal.pooledTeu}TEU · 참여사 정보 익명</dd></div></dl>
      </ReviewSection>

      <ReviewSection title="예상 비용" badge={<ConfidenceBadge kind="예상값" />}>
        <div className="rp-review-cost"><strong>{formatManWon(proposal.cost)}</strong><span>현재 도로비 대비 약 {proposal.savingsRate}% 절감 예상</span></div>
        {proposal.breakdown.map(([label, value, confidence]) => <div className="rp-review-cost-row" key={label}><span>{label}</span><strong>{formatManWon(value)} <ConfidenceBadge kind={confidence} compact /></strong></div>)}
        <p className="rp-review-footnote">실제 운임은 코레일 담당자 확인 후 확정됩니다.</p>
      </ReviewSection>

      <ReviewSection title="아직 확인이 필요한 항목" badge={<StatusPill tone="orange">3건</StatusPill>}>
        <ul className="rp-check-list"><li><ConfidenceBadge kind="확인 필요" /> 기존 열차 추가 적재 가능 여부</li><li><ConfidenceBadge kind="확인 필요" /> 최종 철도 운임과 할인 적용</li><li><ConfidenceBadge kind="확인 필요" /> 화물역 품목 취급 가능 여부</li></ul>
      </ReviewSection>

      <ReviewSection title="탄소 절감 자료" badge={<ConfidenceBadge kind="예상값" />}>
        <div className="rp-carbon-report"><Icon name="leaf" size={21} /><div><strong>약 {proposal.carbonSavings}톤 CO₂ 절감 · −{proposal.carbonRate}%</strong><span>철도와 문전 트럭 구간을 포함한 예상 비교값</span></div></div>
        <p>등록한 화물 무게와 운송 구간을 기준으로 도로 운송과 철도 전환 시나리오를 비교했습니다.</p>
        <p className="rp-review-footnote">실제 제출용 탄소 자료는 최신 배출계수와 운송 거리를 코레일 담당자가 다시 확인합니다.</p>
      </ReviewSection>

      <ReviewSection title="전환교통 지원사업 안내" badge={<StatusPill tone="blue">대상 가능</StatusPill>}>
        <p>도로에서 철도로 전환하는 중소기업의 대상 요건에 해당할 수 있습니다. 개별 건 자동 지급이 아닌 <strong>사전 협약제</strong>이며, 최신 공모와 단가는 별도 확인이 필요합니다.</p>
      </ReviewSection>

      <section className="rp-review-contact"><span>담당자 연락처</span><strong>{requestInput.contact || '등록된 물류 담당자 연락처'}</strong></section>
      <div className="rp-attachment-row"><button type="button" onClick={() => window.print()}>비교표 PDF 미리보기</button><button type="button" onClick={() => window.print()}>탄소 자료 PDF 미리보기</button></div>
      <LegalNotice />
      <div className="rp-review-actions"><SecondaryButton onClick={() => window.print()}>PDF 저장</SecondaryButton><PrimaryButton disabled={busy} onClick={submit}>{busy ? '전송 중…' : '검토 요청 보내기'}</PrimaryButton></div>
    </div>
  )
}

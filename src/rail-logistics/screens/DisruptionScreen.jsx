import { ConfidenceBadge, Icon, LegalNotice, PrimaryButton, SecondaryButton, StatusPill } from '../components.jsx'
import { formatManWon } from '../demoData.js'

export function DisruptionScreen({ onAccept, onCompare, onLeave, busy }) {
  return (
    <div className="rp-disruption-screen">
      <section className="rp-push-preview">
        <div className="rp-push-preview__app"><span><Icon name="train" size={15} /></span><strong>레일물류</strong><time>지금</time></div>
        <h1>함께 가는 화물에 변동이 생겼어요</h1>
        <p>A사의 4TEU가 취소되었습니다. AI가 새 조합을 찾았습니다.</p>
      </section>

      <section className="rp-impact-card">
        <div className="rp-impact-card__icon"><Icon name="alert" size={20} /></div>
        <div><span>8월 14일 14:06 변동</span><h2>참여사 1이 참여를 취소했습니다</h2><p>함께 가는 물량 <strong>15TEU → 11TEU</strong>, 목표까지 7TEU가 부족합니다.</p></div>
      </section>

      <p className="rp-impact-copy">이대로면 목표 미달로 이번 회차가 취소될 수 있습니다. 고객님이 열어둔 조건 안에서 새 방법을 찾았습니다.</p>

      <article className="rp-recovery-card">
        <div className="rp-recovery-card__top"><StatusPill tone="blue"><Icon name="spark" size={11} /> AI 새 역제안</StatusPill><small>8월 14일 18시까지 회신</small></div>
        <h2>출발일과 비용은 그대로 유지할 수 있어요</h2>
        <p>같은 수요일 출발이 가능한 새 참여사 2건, 4TEU를 확인했습니다.</p>
        <div className="rp-recovered-meter"><span><i style={{ width: '83%' }} /></span><strong>11TEU <i>→</i> 15TEU</strong><small>목표 18TEU · 예상값</small></div>
        <div className="rp-unchanged-grid">
          <section><span>그대로인 것</span><strong>출발일 · 화물역</strong><strong>도착 예정 · 내 비용</strong></section>
          <section><span>바뀌는 것</span><strong>참여사 구성</strong><strong>확인 필요 1건 추가</strong></section>
        </div>
        <div className="rp-disruption-metrics"><div><span>내 예상 비용</span><strong>{formatManWon(2_560_000)} <ConfidenceBadge kind="예상값" compact /></strong></div><div><span>도착 예정</span><strong>8월 20일 13:00 <ConfidenceBadge kind="예상값" compact /></strong></div></div>
        <dl className="rp-recovery-reason"><div><dt>AI가 이 안을 찾은 이유</dt><dd>D사 3TEU와 E사 1TEU가 같은 수요일 출발이 가능해 함께 가는 물량을 15TEU로 회복할 수 있습니다.</dd></div><div><dt>주의</dt><dd>D사의 도착 마감시간은 아직 <ConfidenceBadge kind="확인 필요" compact /> 상태입니다.</dd></div></dl>
        <div className="rp-recovery-actions"><PrimaryButton disabled={busy} onClick={onAccept}>{busy ? '반영 중…' : '새 조건으로 계속 진행'}</PrimaryButton><SecondaryButton onClick={onCompare}>상세 비교 보기</SecondaryButton><button type="button" className="rp-text-button" onClick={onLeave}>이번엔 빠지겠습니다</button></div>
      </article>

      <p className="rp-no-response">회신이 없으면 자동으로 취소되며 비용은 발생하지 않습니다. 결정하지 않으셔도 됩니다.</p>
      <LegalNotice />
    </div>
  )
}

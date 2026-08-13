import { useState } from 'react'
import { BASELINE, formatManWon } from '../demoData.js'
import { ConfidenceBadge, Icon, PrimaryButton, SecondaryButton, StatusPill } from '../components.jsx'

function valueWithBadge(value, badge) {
  return <>{value}{badge && <> <ConfidenceBadge kind={badge} compact /></>}</>
}

export function ComparisonScreen({ proposals, initialProposal, onBack, onProceed }) {
  const initialIndex = Math.max(0, proposals.findIndex((proposal) => proposal.id === initialProposal?.id))
  const [index, setIndex] = useState(initialIndex)
  const proposal = proposals[index]

  const rows = [
    ['운송 방식', BASELINE.mode, '철도 함께 보내기'],
    ['출발일', BASELINE.departure, proposal.departure],
    ['도착 예정', BASELINE.arrival, proposal.arrival],
    ['마감 준수', '✓ 준수', proposal.deadlineMet ? '✓ 준수' : '! 2시간 초과'],
    ['이용 화물역', '이용 안 함', proposal.station],
    ['총 소요시간', BASELINE.duration, `${proposal.duration} (${proposal.timeDelta})`],
    ['전체 비용', formatManWon(BASELINE.cost), valueWithBadge(formatManWon(proposal.cost), '예상값')],
    ['공장→화물역 트럭비', '—', valueWithBadge(formatManWon(proposal.breakdown[0][1]), proposal.breakdown[0][2])],
    ['상하차비', '—', valueWithBadge(formatManWon(proposal.breakdown[1][1]), proposal.breakdown[1][2])],
    ['철도운임', '—', valueWithBadge(formatManWon(proposal.breakdown[2][1]), proposal.breakdown[2][2])],
    ['화물역→목적지 트럭비', '—', valueWithBadge(formatManWon(proposal.breakdown[3][1]), proposal.breakdown[3][2])],
    ['대기·보관비', '0원', valueWithBadge(formatManWon(proposal.breakdown[4][1]), proposal.breakdown[4][2])],
    ['절감액·절감률', '기준', `−${formatManWon(proposal.savings)} · −${proposal.savingsRate}%`],
    ['함께 가는 화물', '없음', `${proposal.pooledTeu}TEU / 목표 ${proposal.targetTeu}TEU`],
    ['확정 가능성', '확정', proposal.pooledTeu >= 15 ? '높음 · 예상값' : '보통 · 예상값'],
    ['바뀌는 조건', '없음', proposal.axes.join(' · ')],
    ['정보 신뢰도', '입력값 기준', proposal.trustSummary],
    ['탄소 배출', `${BASELINE.carbonTons}톤`, valueWithBadge(`${proposal.carbonTons}톤 · −${proposal.carbonRate}%`, '예상값')],
    ['전환교통 지원사업', '해당 없음', '대상 가능 · 사전 협약 필요'],
    ['사용한 조정 축', '없음', proposal.axes.join(' · ')],
  ]

  return (
    <div className="rp-compare-screen">
      <div className="rp-compare-heading">
        <div><span>제안 비교</span><h1>같은 기준으로 나란히 볼게요</h1></div>
        <StatusPill tone="soft">{index + 1} / {proposals.length}</StatusPill>
      </div>
      <div className="rp-compare-switcher">
        {proposals.map((item, itemIndex) => <button type="button" key={item.id} className={itemIndex === index ? 'is-active' : ''} onClick={() => setIndex(itemIndex)}>{item.type.replace(' 제안', '')}</button>)}
      </div>
      <div className="rp-compare-table" role="table" aria-label="내 원래 계획과 제안 비교">
        <div className="rp-compare-table__head" role="row"><span role="columnheader">비교 항목</span><strong role="columnheader">내 원래 계획</strong><strong role="columnheader">{proposal.type}</strong></div>
        {rows.map(([label, original, alternative], rowIndex) => (
          <div className={`rp-compare-row ${label === '전체 비용' ? 'is-key' : ''} ${rowIndex > 6 && rowIndex < 12 ? 'is-detail' : ''}`} role="row" key={label}>
            <span role="rowheader">{label}</span><div role="cell">{original}</div><div role="cell">{alternative}</div>
          </div>
        ))}
      </div>
      <div className="rp-compare-summary"><Icon name="spark" size={18} /><p><strong>{formatManWon(proposal.savings)} 절감</strong>을 위해 <strong>{proposal.tradeoff}</strong>을 감수하는 안입니다.</p></div>
      <div className="rp-sticky-actions"><SecondaryButton onClick={onBack}>돌아가기</SecondaryButton><PrimaryButton onClick={() => onProceed(proposal)}>이 안으로 진행</PrimaryButton></div>
    </div>
  )
}

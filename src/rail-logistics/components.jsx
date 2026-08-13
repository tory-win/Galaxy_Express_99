import { AppHeader, AppIcon, Button, SectionHeading as KorailSectionHeading, StatusBar, StatusPill as KorailStatusPill, SubBottomNav } from '../design-system/index.js'

export const Icon = AppIcon

export function RailHeader({ title, eyebrow, onBack }) {
  return (
    <>
      <StatusBar />
      <AppHeader
        title={title}
        eyebrow={eyebrow}
        back
        backLabel="이전 화면으로 돌아가기"
        onBack={onBack}
        className="is-centered"
      />
    </>
  )
}

export function RailBottomNav({ active, unread = 0, onNavigate }) {
  const items = [
    { id: 'dashboard', label: '내 운송', icon: 'home' },
    { id: 'request', label: 'AI에게 찾아달라하기', icon: 'plus' },
    { id: 'notifications', label: '알림', icon: 'bell', unread },
  ]
  return (
    <SubBottomNav
      className="rp-bottom-nav"
      active={active}
      onChange={onNavigate}
      items={items.map((item) => ({ ...item, badge: item.unread || undefined, icon: <Icon name={item.icon} size={19} /> }))}
    />
  )
}

const BADGE_KIND = {
  '확인 완료': ['✓', 'verified'],
  '예상값': ['≈', 'estimated'],
  '확인 필요': ['○', 'missing'],
  '정보 없음': ['○', 'missing'],
  '다시 확인 필요': ['↻', 'refresh'],
  '서로 다름': ['!', 'conflict'],
}

export function ConfidenceBadge({ kind, compact = false }) {
  const [icon, tone] = BADGE_KIND[kind] ?? ['·', 'neutral']
  return <span className={`rp-confidence rp-confidence--${tone} ${compact ? 'is-compact' : ''}`}><b>{icon}</b>{kind}</span>
}

export function StatusPill({ children, tone = 'blue' }) {
  const tones = { blue: 'brand', green: 'positive', orange: 'warning', soft: 'soft' }
  return <KorailStatusPill tone={tones[tone] ?? tone}>{children}</KorailStatusPill>
}

export function PrimaryButton({ children, onClick, disabled = false, className = '', type = 'button' }) {
  return <Button type={type} className={`rp-primary-button ${className}`} disabled={disabled} onClick={onClick}>{children}</Button>
}

export function SecondaryButton({ children, onClick, className = '', disabled = false }) {
  return <Button variant="secondary" className={`rp-secondary-button ${className}`} disabled={disabled} onClick={onClick}>{children}</Button>
}

export function TertiaryButton({ children, onClick, className = '', disabled = false }) {
  return <Button variant="ghost" className={`rp-tertiary-button ${className}`} disabled={disabled} onClick={onClick}>{children}</Button>
}

export function SectionHeading({ eyebrow, title, aside, id }) {
  return <KorailSectionHeading className="rp-section-heading" eyebrow={eyebrow} title={title} aside={aside} id={id} />
}

export function LegalNotice() {
  return (
    <p className="rp-legal-notice">
      레일물류에서 표시하는 비용과 일정은 예상값이며,
      실제 운송 가능 여부와 운임은 코레일 담당자 확인이 필요합니다.
      <strong> 최종 조건은 담당자 확인 후 확정됩니다.</strong>
    </p>
  )
}

export function LoadingPanel({ label = '운송 방법을 찾고 있어요' }) {
  return (
    <div className="rp-loading" role="status">
      <span className="rp-loading__mark"><Icon name="train" size={28} /></span>
      <h2>{label}</h2>
      <p>입력한 조건과 현재 운송 가능 구간을 확인하고 있습니다.</p>
    </div>
  )
}

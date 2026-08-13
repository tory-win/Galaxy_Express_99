import { StatusBar } from '../design-system/index.js'

export function Icon({ name, size = 20 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true }
  if (name === 'back') return <svg {...common}><path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
  if (name === 'bell') return <svg {...common}><path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
  if (name === 'home') return <svg {...common}><path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
  if (name === 'plus') return <svg {...common}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
  if (name === 'check') return <svg {...common}><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
  if (name === 'spark') return <svg {...common}><path d="m12 2 1.5 5.2L19 9l-5.5 1.8L12 16l-1.5-5.2L5 9l5.5-1.8L12 2ZM19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" fill="currentColor" /></svg>
  if (name === 'train') return <svg {...common}><rect x="5" y="3" width="14" height="15" rx="4" stroke="currentColor" strokeWidth="1.8"/><path d="M8 8h8M8 12h8M8 21l2-3M16 18l2 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="15" r="1" fill="currentColor"/><circle cx="15" cy="15" r="1" fill="currentColor"/></svg>
  if (name === 'mail') return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
  if (name === 'alert') return <svg {...common}><path d="M12 3 2.7 20h18.6L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M12 9v5M12 17.2v.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  if (name === 'leaf') return <svg {...common}><path d="M20 4C11 4 5 8 5 14c0 3 2 5 5 5 6 0 10-6 10-15Z" stroke="currentColor" strokeWidth="1.8"/><path d="M4 21c3-6 7-9 13-12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  if (name === 'people') return <svg {...common}><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8"/><circle cx="17" cy="9" r="2" stroke="currentColor" strokeWidth="1.6"/><path d="M3 20c0-4 2.5-7 6-7s6 3 6 7M15 14c3 0 5 2 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  return <svg {...common}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" /></svg>
}

export function RailHeader({ title, eyebrow, onBack, onNotifications, unread = 1 }) {
  return (
    <>
      <StatusBar />
      <header className="rp-header">
        <button type="button" className="rp-icon-button" aria-label="이전 화면으로 돌아가기" onClick={onBack}>
          <Icon name="back" size={19} />
        </button>
        <div className="rp-header__title">
          {eyebrow && <span>{eyebrow}</span>}
          <strong>{title}</strong>
        </div>
        <button type="button" className="rp-icon-button rp-bell" aria-label={`알림 ${unread}건`} onClick={onNotifications}>
          <Icon name="bell" size={19} />
          {unread > 0 && <i>{unread}</i>}
        </button>
      </header>
    </>
  )
}

export function RailBottomNav({ active, onNavigate }) {
  const items = [
    { id: 'dashboard', label: '내 운송', icon: 'home' },
    { id: 'request', label: '새 요청', icon: 'plus' },
    { id: 'notifications', label: '알림', icon: 'bell', unread: 1 },
  ]
  return (
    <nav className="rp-bottom-nav" aria-label="레일물류 메뉴">
      {items.map((item) => (
        <button
          type="button"
          key={item.id}
          className={active === item.id ? 'is-active' : ''}
          aria-current={active === item.id ? 'page' : undefined}
          onClick={() => onNavigate(item.id)}
        >
          <span className="rp-bottom-nav__icon"><Icon name={item.icon} size={19} />{item.unread && <i>{item.unread}</i>}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
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
  return <span className={`rp-status-pill rp-status-pill--${tone}`}>{children}</span>
}

export function PrimaryButton({ children, onClick, disabled = false, className = '', type = 'button' }) {
  return <button type={type} className={`rp-primary-button ${className}`} disabled={disabled} onClick={onClick}>{children}</button>
}

export function SecondaryButton({ children, onClick, className = '', disabled = false }) {
  return <button type="button" className={`rp-secondary-button ${className}`} disabled={disabled} onClick={onClick}>{children}</button>
}

export function SectionHeading({ eyebrow, title, aside }) {
  return (
    <div className="rp-section-heading">
      <div>{eyebrow && <span>{eyebrow}</span>}<h2>{title}</h2></div>
      {aside}
    </div>
  )
}

export function LegalNotice() {
  return (
    <p className="rp-legal-notice">
      RAILPOOL AI는 운송을 예약하거나 계약하지 않습니다. 표시된 비용과 일정은 예상값이며,
      실제 운송 가능 여부와 운임은 코레일 담당자 확인이 필요합니다.
      <strong> 가상 데이터로 만든 예시입니다.</strong>
    </p>
  )
}

export function LoadingPanel({ label = '조건을 조합하고 있어요' }) {
  return (
    <div className="rp-loading" role="status">
      <span className="rp-loading__mark"><Icon name="spark" size={28} /></span>
      <h2>{label}</h2>
      <p>기준선과 조정 가능한 조건을 함께 계산합니다.</p>
      <span className="rp-loading__bar"><i /></span>
      <ul>
        <li className="is-done"><Icon name="check" size={13} /> 안전·규정 확인</li>
        <li className="is-done"><Icon name="check" size={13} /> 내 원래 계획 계산</li>
        <li><span className="rp-spinner" /> 더 나은 조합 탐색</li>
      </ul>
    </div>
  )
}

import { assetUrl } from '../../lib/assets.js'

const NAV_ITEMS = [
  { id: 'home', label: '홈' },
  { id: 'mobility', label: '이동 · 편의' },
  { id: 'travel', label: '여행' },
  { id: 'tickets', label: '나의 티켓' },
  { id: 'menu', label: '전체메뉴' },
]

export function BottomNav({ active, onChange }) {
  return (
    <nav className="kr-bottom-nav" aria-label="주요 메뉴">
      {NAV_ITEMS.map((item) => {
        const selected = item.id === active
        return (
          <button
            type="button"
            key={item.id}
            className={`kr-bottom-nav__item ${selected ? 'is-active' : ''}`}
            aria-current={selected ? 'page' : undefined}
            onClick={() => onChange(item.id)}
          >
            <img src={assetUrl(`nav-${item.id}-${selected ? 'active' : 'idle'}.png`)} alt="" />
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

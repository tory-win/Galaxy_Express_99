import { AppHeader, AssetButton, CopyIcon, MenuRow, StatusBar } from '../design-system/index.js'
import { menuSupportRows, menuTrainRows } from '../data/services.js'
import { ChevronRight } from '../design-system/components/icons.jsx'
import { assetUrl } from '../lib/assets.js'

const shortcuts = [
  { label: '기차 예매', icon: assetUrl('train-map.png') },
  { label: '혜택·정기권', icon: assetUrl('benefit-special.png') },
  { label: '열차 지도 보기', icon: assetUrl('service-airport-bus.png') },
  { label: '길안내', icon: assetUrl('service-directions.png') },
  { label: '지역별여행', icon: assetUrl('travel-regional.png') },
]

export function MenuScreen({ onNotify, onCart, onOpenBenefits, onHome }) {
  return (
    <div className="kr-screen kr-menu-screen">
      <StatusBar />
      <AppHeader
        title="전체메뉴"
        actions={(
          <>
            <AssetButton src={assetUrl('header-language.png')} label="언어 설정" onClick={() => onNotify('언어 설정')} />
            <AssetButton src={assetUrl('header-bell.png')} label="알림" onClick={() => onNotify('새로운 알림이 없어요')} />
            <AssetButton src={assetUrl('header-cart.png')} label="장바구니" onClick={onCart} />
          </>
        )}
      />
      <main className="kr-menu-body">
        <section className="kr-profile-block">
          <button type="button" className="kr-profile-main" onClick={() => onNotify('마이페이지')}>
            <span><strong>코레일 회원</strong><small>0000000000 <CopyIcon /></small></span>
            <span className="kr-profile-link">마이페이지 <ChevronRight size={16} /></span>
          </button>
          <div className="kr-profile-stats">
            <button type="button" onClick={() => onNotify('보유 쿠폰이 없어요')}><span>쿠폰 <ChevronRight size={12} /></span><strong>0</strong></button>
            <button type="button" onClick={() => onNotify('KTX 마일리지')}><span>KTX 마일리지 <ChevronRight size={12} /></span><strong>0</strong></button>
          </div>
        </section>

        <section className="kr-all-services">
          <div className="kr-section-heading"><strong>전체 서비스</strong><button type="button" onClick={() => onNotify('전체 서비스')}>전체보기 <ChevronRight size={12} /></button></div>
          <div className="kr-shortcuts">
            {shortcuts.map((shortcut) => (
              <button
                type="button"
                key={shortcut.label}
                onClick={() => shortcut.label === '혜택·정기권' ? onOpenBenefits('pass') : shortcut.label === '기차 예매' ? onHome() : onNotify(shortcut.label)}
              >
                <img src={shortcut.icon} alt="" /><span>{shortcut.label}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="kr-menu-divider" />
        <section className="kr-menu-section">
          <h2>기차</h2>
          {menuTrainRows.map((row) => <MenuRow key={row.label} {...row} onClick={() => onNotify(row.label)} />)}
        </section>
        <div className="kr-menu-divider" />
        <section className="kr-menu-section kr-menu-section--support">
          <h2>고객지원</h2>
          {menuSupportRows.map((row) => <MenuRow key={row.label} {...row} onClick={() => onNotify(row.label)} />)}
        </section>
      </main>
    </div>
  )
}

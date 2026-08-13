import { useState } from 'react'
import {
  AppHeader,
  FilterChip,
  MenuRow,
  ProductCard,
  SearchField,
  SegmentTabs,
  ServiceTile,
  Surface,
} from '../design-system/index.js'
import { assetUrl } from '../lib/assets.js'

const swatches = [
  ['Brand', '#1B72F4'],
  ['Brand soft', '#EEF5FF'],
  ['Ink', '#202127'],
  ['Muted', '#8B8E97'],
  ['Canvas', '#F8F7FC'],
  ['Surface', '#FFFFFF'],
]

export function DesignSystemScreen() {
  const [tab, setTab] = useState('pass')
  const [chip, setChip] = useState('전국')
  const [query, setQuery] = useState('')

  return (
    <main className="ds-page">
      <header className="ds-hero">
        <a href="#/">← 클론 앱</a>
        <p>Korail+ Foundations & Components</p>
        <h1>코레일+ 디자인 시스템</h1>
        <span>실제 앱에서 추출한 색상, 타이포, 간격, 모서리, 그림자와 재사용 컴포넌트입니다.</span>
      </header>

      <section className="ds-section">
        <div className="ds-section__title"><h2>Foundations</h2><p>토큰은 <code>src/design-system/tokens.css</code> 한 곳에서 관리합니다.</p></div>
        <div className="ds-swatches">
          {swatches.map(([name, value]) => (
            <article key={name}><i style={{ background: value }} /><strong>{name}</strong><code>{value}</code></article>
          ))}
        </div>
        <div className="ds-foundation-grid">
          <article>
            <h3>Typography</h3>
            <div className="ds-type-sample"><b>20</b> 전체메뉴</div>
            <div className="ds-type-sample is-16"><b>16</b> 알짜배기 기차 여행</div>
            <div className="ds-type-sample is-14"><b>14</b> 이용 가능한 티켓</div>
            <div className="ds-type-sample is-12"><b>12</b> 모든 열차 운행 정보를 한 눈에 확인</div>
          </article>
          <article>
            <h3>Shape & elevation</h3>
            <div className="ds-shape-row"><span className="ds-radius-control">8</span><span className="ds-radius-card">11</span><span className="ds-radius-sheet">24</span></div>
          </article>
          <article>
            <h3>Spacing</h3>
            <div className="ds-spacing-row">{[4, 8, 12, 16, 20, 24, 32].map((size) => <span key={size} style={{ width: size, height: size }} title={`${size}px`} />)}</div>
          </article>
        </div>
      </section>

      <section className="ds-section">
        <div className="ds-section__title"><h2>Navigation & controls</h2><p>상태를 가진 실제 컴포넌트입니다.</p></div>
        <div className="ds-component-grid">
          <div className="ds-component-card ds-component-card--wide">
            <AppHeader title="이동 · 편의" actions={<img className="ds-header-icon" src={assetUrl('header-cart.png')} alt="" />} />
          </div>
          <div className="ds-component-card">
            <SegmentTabs items={[{ value: 'pass', label: '정기권' }, { value: 'ncard', label: 'N카드' }, { value: 'special', label: '특가상품' }]} value={tab} onChange={setTab} />
          </div>
          <div className="ds-component-card">
            <div className="ds-inline">{['전국', '수도권', '강원권'].map((item) => <FilterChip key={item} active={chip === item} onClick={() => setChip(item)}>{item}</FilterChip>)}</div>
          </div>
          <div className="ds-component-card ds-component-card--wide">
            <SearchField value={query} onChange={setQuery} placeholder="여행지, 테마, 상품을 검색해보세요" />
          </div>
        </div>
      </section>

      <section className="ds-section">
        <div className="ds-section__title"><h2>Cards & rows</h2><p>새 기획 화면은 아래 패턴을 조합해 구성합니다.</p></div>
        <div className="ds-component-grid">
          <Surface className="ds-service-surface">
            <ServiceTile icon={assetUrl('mobility-directions.png')} label="길안내" circle />
            <ServiceTile icon={assetUrl('mobility-parking.png')} label="주차·정산" circle />
            <ServiceTile icon={assetUrl('mobility-airport-bus.png')} label="공항버스" circle />
          </Surface>
          <div className="ds-component-card ds-list-sample">
            <MenuRow label="이용 가능 티켓" meta="승차권·정기권·N카드" />
            <MenuRow label="예약 승차권 조회·취소" />
          </div>
          <ProductCard
            title="기간자유형 정기권"
            description="기간내 왕복 총 운임 기준 45~60% 할인"
            icon={assetUrl('benefits-sun.png')}
            details={[{ label: '기간', value: '10일 이상 사용' }, { label: '요일', value: '주중만 or 휴일 포함 이용 중 선택' }]}
          />
        </div>
      </section>

      <footer className="ds-footer">새 화면은 <code>src/design-system</code>의 컴포넌트와 토큰만 import해서 확장하세요.</footer>
    </main>
  )
}

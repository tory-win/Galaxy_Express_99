import { AppHeader, AssetButton, FilterChip, SearchField, ServiceTile, StatusBar } from '../design-system/index.js'
import { travelServices } from '../data/services.js'
import { assetUrl } from '../lib/assets.js'

const regions = ['전국', '수도권', '강원권', '충청권', '경상권']

export function TravelScreen({ onNotify, onCart, query, setQuery, region, setRegion }) {
  return (
    <div className="kr-screen kr-travel-screen">
      <StatusBar />
      <AppHeader
        title="여행"
        actions={<AssetButton src={assetUrl('header-cart.png')} label="장바구니" onClick={onCart} />}
      />
      <main className="kr-travel-body">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="여행지, 테마, 상품을 검색해보세요"
        />
        <div className="kr-travel-grid">
          {travelServices.map((service) => (
            <ServiceTile
              circle
              key={service.id}
              icon={assetUrl(`travel-${service.id}.png`)}
              label={service.label}
              onClick={() => onNotify(`${service.label} 상품을 살펴봐요`)}
            />
          ))}
        </div>

        <button type="button" className="kr-travel-banner" onClick={() => onNotify('상반기 어워즈를 열었어요')}>
          <img src={assetUrl('travel-banner.png')} alt="2026 지역 사랑 철도여행 상반기 어워즈 인기지역은 어디일까요?" />
        </button>

        <section className="kr-random-travel">
          <h2>알짜배기 기차 여행</h2>
          <div className="kr-region-chips">
            {regions.map((item) => (
              <FilterChip key={item} active={region === item} onClick={() => setRegion(item)}>{item}</FilterChip>
            ))}
          </div>
          <div className="kr-travel-cards">
            <button type="button" onClick={() => onNotify(`${region} 여행 상품을 선택했어요`)}><img src={assetUrl('travel-card-left.png')} alt="" /></button>
            <button type="button" onClick={() => onNotify(`${region} 추천 상품을 선택했어요`)}><img src={assetUrl('travel-card-right.png')} alt="" /></button>
          </div>
        </section>
      </main>
    </div>
  )
}

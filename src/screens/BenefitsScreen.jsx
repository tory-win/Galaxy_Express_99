import { AppHeader, ProductCard, SegmentTabs, StatusBar } from '../design-system/index.js'
import { assetUrl } from '../lib/assets.js'

const tabItems = [
  { value: 'pass', label: '정기권' },
  { value: 'ncard', label: 'N카드' },
  { value: 'special', label: '특가상품' },
]

export function BenefitsScreen({ activeTab, setActiveTab, onBack }) {
  const isPass = activeTab === 'pass'
  return (
    <div className="kr-screen kr-benefits-screen">
      <StatusBar />
      <AppHeader title="혜택·정기권" back onBack={onBack} />
      <SegmentTabs items={tabItems} value={activeTab} onChange={setActiveTab} className="kr-benefits-tabs" />
      <main className="kr-benefits-body">
        <section className="kr-benefits-intro">
          <div>
            <h2>{isPass ? '정기승차권' : activeTab === 'ncard' ? 'N카드' : '특가상품'}</h2>
            <p>{isPass ? '구간과 기간을 지정하여 자유롭게 이용할 수 있는 할인 상품' : activeTab === 'ncard' ? '자주 이용하는 구간을 더 합리적으로 이용하는 상품' : '여행 상황에 맞춘 코레일 할인 상품'}</p>
          </div>
          <img src={assetUrl(isPass ? 'benefits-calendar.png' : activeTab === 'ncard' ? 'benefit-ncard.png' : 'benefit-special.png')} alt="" />
        </section>

        {isPass ? (
          <div className="kr-benefits-products">
            <ProductCard
              title="기간자유형 정기권"
              description="기간내 왕복 총 운임 기준 45~60% 할인"
              icon={assetUrl('benefits-sun.png')}
              details={[
                { label: '기간', value: '10일 이상 사용' },
                { label: '요일', value: '주중만 or 휴일 포함 이용 중 선택' },
              ]}
            />
            <ProductCard
              title="일반 정기권"
              description="기간내 왕복 총 운임 기준 45~60% 할인"
              icon={assetUrl('benefits-mon.png')}
              details={[
                { label: '기간', value: '10일 / 1개월' },
                { label: '요일', value: '주중(월~금)만 이용 가능, 휴일 · 공휴일 제외' },
              ]}
            />
          </div>
        ) : (
          <div className="kr-benefits-placeholder">
            <img src={assetUrl(activeTab === 'ncard' ? 'benefit-ncard.png' : 'benefit-special.png')} alt="" />
            <strong>{activeTab === 'ncard' ? 'N카드 상품' : '특가상품'}</strong>
            <p>필요한 상품을 선택해 상세 혜택을 확인해보세요.</p>
          </div>
        )}
      </main>
    </div>
  )
}

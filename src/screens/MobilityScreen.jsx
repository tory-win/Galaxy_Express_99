import { AppHeader, AssetButton, SendIcon, ServiceTile, StatusBar } from '../design-system/index.js'
import { mobilityServices } from '../data/services.js'
import { assetUrl } from '../lib/assets.js'

export function MobilityScreen({ onOpenRailLogistics, onNotify, onCart }) {
  return (
    <div className="kr-screen kr-mobility-screen">
      <StatusBar />
      <AppHeader
        title="이동 · 편의"
        actions={<AssetButton src={assetUrl('header-cart.png')} label="장바구니" onClick={onCart} />}
      />
      <main className="kr-mobility-body">
        <div className="kr-mobility-grid">
          {mobilityServices.map((service) => (
            <ServiceTile
              circle
              key={service.id}
              icon={assetUrl(service.icon?.mobility ?? `mobility-${service.id}.png`)}
              label={service.label}
              onClick={() => service.id === 'rail-logistics'
                ? onOpenRailLogistics()
                : onNotify(`${service.label} 서비스를 선택했어요`)}
            />
          ))}
        </div>

        <section className="kr-nearby-panel">
          <h2>가까운 편의서비스</h2>
          <button type="button" className="kr-train-location" onClick={() => onNotify('현재 열차 위치를 불러왔어요')}>
            <span>내위치: 03722</span>
            <SendIcon />
          </button>
          <div className="kr-parking-heading"><strong><em>서울역</em> 근처 주차 정보</strong></div>
          <button type="button" className="kr-parking-row" onClick={() => onNotify('KTX빌딩주차장 상세를 열었어요')}>
            <span className="kr-parking-dot" />
            <strong>KTX빌딩주차장</strong>
            <span className="kr-parking-count">잔여 주차&nbsp; <b>0 / 114</b></span>
          </button>
          <div className="kr-faint-row"><strong>서울역</strong> 주변 편의시설 더보기</div>
        </section>
      </main>
    </div>
  )
}

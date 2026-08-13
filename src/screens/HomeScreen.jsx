import { AppHeader, AssetButton, ServiceTile, StatusBar, Surface } from '../design-system/index.js'
import { mobilityServices } from '../data/services.js'
import { assetUrl } from '../lib/assets.js'

const benefits = [
  { id: 'pass', label: '정기권', asset: assetUrl('benefit-pass.png') },
  { id: 'ncard', label: 'N카드', asset: assetUrl('benefit-ncard.png') },
  { id: 'special', label: '특가상품', asset: assetUrl('benefit-special.png') },
]

export function HomeScreen({ onOpenBenefits, onOpenRailLogistics, onNotify, onCart }) {
  return (
    <div className="kr-screen kr-home-screen">
      <StatusBar />
      <AppHeader
        logo
        actions={(
          <>
            <AssetButton src={assetUrl('header-benefits.png')} label="코레일 혜택" onClick={() => onNotify('코레일 혜택')} />
            <AssetButton src={assetUrl('header-bell.png')} label="알림" onClick={() => onNotify('새로운 알림이 없어요')} />
            <AssetButton src={assetUrl('header-cart.png')} label="장바구니" onClick={onCart} />
          </>
        )}
      />

      <main className="kr-home-body">
        <img className="kr-home-banner" src={assetUrl('home-banner.png')} alt="코레일-SR 통합 철도회원 전환 안내" />

        <Surface className="kr-benefit-strip">
          {benefits.map((benefit) => (
            <button type="button" key={benefit.id} onClick={() => onOpenBenefits(benefit.id)}>
              <img src={benefit.asset} alt="" />
              <span>{benefit.label}</span>
            </button>
          ))}
        </Surface>

        <Surface className="kr-home-services">
          {mobilityServices.map((service) => (
            <ServiceTile
              key={service.id}
              icon={assetUrl(service.icon?.home ?? `service-${service.id}.png`)}
              label={service.label}
              onClick={() => service.id === 'rail-logistics'
                ? onOpenRailLogistics()
                : onNotify(`${service.label} 서비스를 선택했어요`)}
            />
          ))}
        </Surface>

        <Surface className="kr-train-map-card" onClick={() => onNotify('열차 지도 보기를 열었어요')}>
          <img src={assetUrl('train-map.png')} alt="" />
          <span>
            <strong>열차 지도 보기</strong>
            <small>모든 열차 운행 정보를 한 눈에 확인</small>
          </span>
        </Surface>
      </main>
    </div>
  )
}

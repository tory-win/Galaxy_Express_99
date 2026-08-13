import { AssetButton, FilterChip, SegmentTabs, StatusBar } from '../design-system/index.js'
import { ticketFilters } from '../data/services.js'
import { assetUrl } from '../lib/assets.js'

export function TicketsScreen({ tab, setTab, filter, setFilter, onCart }) {
  return (
    <div className="kr-screen kr-tickets-screen">
      <StatusBar />
      <header className="kr-ticket-header">
        <SegmentTabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'available', label: '이용 가능' },
            { value: 'history', label: '구입 이력' },
          ]}
        />
        <AssetButton src={assetUrl('header-cart.png')} label="장바구니" onClick={onCart} />
      </header>
      <main className="kr-ticket-body">
        <div className="kr-ticket-filters">
          {ticketFilters.map((item) => (
            <FilterChip key={item} active={filter === item} onClick={() => setFilter(item)}>{item}</FilterChip>
          ))}
        </div>
        <div className="kr-ticket-empty">
          <img src={assetUrl('empty-ticket.png')} alt="" />
          <p>{tab === 'available' ? '이용 가능한 티켓이 없어요' : '구입 이력이 없어요'}</p>
        </div>
      </main>
    </div>
  )
}

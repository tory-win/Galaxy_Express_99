import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BottomNav } from './design-system/index.js'
import { BenefitsScreen } from './screens/BenefitsScreen.jsx'
import { DesignSystemScreen } from './screens/DesignSystemScreen.jsx'
import { HomeScreen } from './screens/HomeScreen.jsx'
import { MenuScreen } from './screens/MenuScreen.jsx'
import { MobilityScreen } from './screens/MobilityScreen.jsx'
import { TicketsScreen } from './screens/TicketsScreen.jsx'
import { TravelScreen } from './screens/TravelScreen.jsx'
import { RailLogisticsApp } from './rail-logistics/RailLogisticsApp.jsx'
import { assetUrl } from './lib/assets.js'

const BASE_WIDTH = 318
const BASE_HEIGHT = 701
const MAX_WIDTH = 390

function PhoneCanvas({ children }) {
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const updateScale = () => {
      const viewport = window.visualViewport
      const viewportWidth = viewport?.width ?? window.innerWidth
      const viewportHeight = viewport?.height ?? window.innerHeight
      const desktopGutter = viewportWidth > 430 ? 48 : 0
      const availableHeight = Math.max(1, viewportHeight - desktopGutter)
      setScale(Math.min(viewportWidth / BASE_WIDTH, availableHeight / BASE_HEIGHT, MAX_WIDTH / BASE_WIDTH))
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    window.visualViewport?.addEventListener('resize', updateScale)
    return () => {
      window.removeEventListener('resize', updateScale)
      window.visualViewport?.removeEventListener('resize', updateScale)
    }
  }, [])

  return (
    <div className="kr-phone-stage" style={{ width: BASE_WIDTH * scale, height: BASE_HEIGHT * scale }}>
      <div className="kr-phone" style={{ transform: `scale(${scale})` }}>{children}</div>
    </div>
  )
}

function App() {
  const [route, setRoute] = useState(window.location.hash)
  const [screen, setScreen] = useState(() => window.location.hash.startsWith('#rail-logistics') ? 'rail-logistics' : 'home')
  const [returnScreen, setReturnScreen] = useState('home')
  const [benefitTab, setBenefitTab] = useState('pass')
  const [ticketTab, setTicketTab] = useState('available')
  const [ticketFilter, setTicketFilter] = useState('전체')
  const [travelQuery, setTravelQuery] = useState('')
  const [travelRegion, setTravelRegion] = useState('전국')
  const [toast, setToast] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const toastTimer = useRef(null)

  useEffect(() => {
    const onHashChange = () => {
      const nextRoute = window.location.hash
      setRoute(nextRoute)
      if (nextRoute.startsWith('#rail-logistics')) setScreen('rail-logistics')
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const notify = (message) => {
    window.clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = window.setTimeout(() => setToast(''), 1_600)
  }

  const openBenefits = (tab = 'pass') => {
    setReturnScreen(screen)
    setBenefitTab(tab)
    setScreen('benefits')
  }

  const openRailLogistics = () => {
    setReturnScreen(screen)
    setScreen('rail-logistics')
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#rail-logistics`)
    setRoute('#rail-logistics')
  }

  const closeRailLogistics = () => {
    setScreen(returnScreen === 'rail-logistics' ? 'home' : returnScreen)
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    setRoute('')
  }

  if (route.includes('design-system')) return <DesignSystemScreen />

  const screenProps = { onNotify: notify, onCart: () => setCartOpen(true) }

  return (
    <PhoneCanvas>
      <div className="kr-app-shell">
        {screen === 'home' && <HomeScreen {...screenProps} onOpenBenefits={openBenefits} onOpenRailLogistics={openRailLogistics} />}
        {screen === 'mobility' && <MobilityScreen {...screenProps} onOpenRailLogistics={openRailLogistics} />}
        {screen === 'travel' && (
          <TravelScreen
            {...screenProps}
            query={travelQuery}
            setQuery={setTravelQuery}
            region={travelRegion}
            setRegion={setTravelRegion}
          />
        )}
        {screen === 'tickets' && (
          <TicketsScreen
            onCart={() => setCartOpen(true)}
            tab={ticketTab}
            setTab={setTicketTab}
            filter={ticketFilter}
            setFilter={setTicketFilter}
          />
        )}
        {screen === 'menu' && (
          <MenuScreen
            {...screenProps}
            onOpenBenefits={openBenefits}
            onHome={() => setScreen('home')}
          />
        )}
        {screen === 'benefits' && (
          <BenefitsScreen activeTab={benefitTab} setActiveTab={setBenefitTab} onBack={() => setScreen(returnScreen)} />
        )}
        {screen === 'rail-logistics' && <RailLogisticsApp onExit={closeRailLogistics} onNotify={notify} />}

        {!['benefits', 'rail-logistics'].includes(screen) && <BottomNav active={screen} onChange={setScreen} />}

        {toast && <div className={`kr-toast ${screen === 'rail-logistics' ? 'kr-toast--rail-logistics' : ''}`} role="status" aria-live="polite" aria-atomic="true">{toast}</div>}

        {cartOpen && (
          <div className="kr-sheet-layer" role="presentation" onMouseDown={() => setCartOpen(false)}>
            <section className="kr-bottom-sheet" role="dialog" aria-modal="true" aria-label="장바구니" onMouseDown={(event) => event.stopPropagation()}>
              <i className="kr-sheet-handle" />
              <h2>장바구니</h2>
              <img src={assetUrl('empty-ticket.png')} alt="" />
              <p>장바구니가 비어 있어요</p>
              <button type="button" onClick={() => setCartOpen(false)}>확인</button>
            </section>
          </div>
        )}
      </div>
    </PhoneCanvas>
  )
}

export default App

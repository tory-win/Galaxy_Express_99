import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createAndAnalyzeFreightRequest,
  extractFreightConditions,
  getFreightRequest,
  getPoolSnapshot,
  getRailpoolNetwork,
  listFreightRequests,
  saveProposalDecision,
  submitReviewRequest,
  subscribeRailpoolEvents,
} from './api.js'
import { LoadingPanel, PrimaryButton, RailBottomNav, RailHeader, SecondaryButton } from './components.jsx'
import { ComparisonScreen } from './screens/ComparisonScreen.jsx'
import { DashboardScreen } from './screens/DashboardScreen.jsx'
import { DisruptionScreen } from './screens/DisruptionScreen.jsx'
import { PoolScreen } from './screens/PoolScreen.jsx'
import { ProposalsScreen } from './screens/ProposalsScreen.jsx'
import { RequestScreen } from './screens/RequestScreen.jsx'
import { ReviewScreen } from './screens/ReviewScreen.jsx'
import './rail-logistics.css'

const TITLES = {
  dashboard: ['레일물류', 'KORAIL+'],
  request: ['AI에게 운송 요청하기', '레일물류'],
  proposals: ['AI 운송 제안', '레일물류'],
  compare: ['제안 비교', '레일물류'],
  pool: ['함께 보내기', '레일물류'],
  disruption: ['변동 알림', '레일물류'],
  review: ['코레일 검토 요청', '레일물류'],
}

const EMPTY_NETWORK = { totalAgents: 0, activeAgents: 0, agents: [], recentEvents: [] }
const OWN_REQUEST_IDS_KEY = 'railpool:ownRequestIds'
const DEMO_EVENT_TIME = '2026-08-13T06:51:00.000Z'

function buildDemoNetwork(requestId = '') {
  return {
    totalAgents: 10,
    activeAgents: 10,
    agents: [],
    generatedAt: DEMO_EVENT_TIME,
    recentEvents: [{
      id: 'demo-request-published',
      agentId: 'shipper-demo',
      type: 'request_published',
      requestId,
      createdAt: '2026-08-13T06:48:00.000Z',
      payload: { region: '충남권', destination: '부산신항', teu: 3 },
    }],
  }
}

function resetDemoPool(pool) {
  if (!pool) return pool
  return {
    ...pool,
    currentTeu: 15,
    targetTeu: 18,
    unitCost: 640_000,
    status: 'pooling',
    participants: (pool.participants ?? []).filter((participant) => participant.id !== 'demo-video-join'),
  }
}

function readOwnRequestIds() {
  try {
    const ids = JSON.parse(window.localStorage.getItem(OWN_REQUEST_IDS_KEY) ?? '[]')
    return new Set(Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

function ownRequests(requests) {
  const ids = readOwnRequestIds()
  return requests.filter((request) => ids.has(request.id))
}

function rememberOwnRequest(id) {
  const ids = readOwnRequestIds()
  ids.add(id)
  window.localStorage.setItem(OWN_REQUEST_IDS_KEY, JSON.stringify([...ids]))
}

function readSavedView() {
  const saved = window.sessionStorage.getItem('railpool:view')
  return TITLES[saved] ? saved : 'dashboard'
}

function readSavedRequestId() {
  return window.sessionStorage.getItem('railpool:requestId') ?? ''
}

export function RailLogisticsApp({ onExit, onNotify }) {
  const demoMode = new URLSearchParams(window.location.search).get('demo') === '1'
  const [view, setView] = useState(readSavedView)
  const [requests, setRequests] = useState([])
  const [requestId, setRequestId] = useState(readSavedRequestId)
  const [requestInput, setRequestInput] = useState({})
  const [baseline, setBaseline] = useState(null)
  const [proposals, setProposals] = useState([])
  const [selectedProposal, setSelectedProposal] = useState(null)
  const [poolState, setPoolState] = useState(null)
  const [network, setNetwork] = useState(EMPTY_NETWORK)
  const [liveStatus, setLiveStatus] = useState('connecting')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [demoPush, setDemoPush] = useState('')
  const bodyRef = useRef(null)
  const activePoolRef = useRef('')
  const refreshTimerRef = useRef(null)
  const cancelDialogRef = useRef(null)
  const cancelTriggerRef = useRef(null)

  const navigate = (nextView) => {
    const normalized = nextView === 'notifications' ? 'disruption' : nextView
    setView(normalized)
    window.sessionStorage.setItem('railpool:view', normalized)
  }

  const rememberRequest = (id) => {
    setRequestId(id)
    window.sessionStorage.setItem('railpool:requestId', id)
  }

  const refreshRequests = async () => {
    const result = await listFreightRequests()
    setRequests(ownRequests(result.requests ?? []))
  }

  const refreshPool = async (id = activePoolRef.current) => {
    if (!id) return
    const result = await getPoolSnapshot(id)
    setPoolState(result.pool)
  }

  const scheduleLiveRefresh = (event) => {
    if (demoMode) return
    window.clearTimeout(refreshTimerRef.current)
    refreshTimerRef.current = window.setTimeout(async () => {
      try {
        const tasks = [getRailpoolNetwork(), listFreightRequests()]
        if (activePoolRef.current && (!event.requestId || event.requestId === activePoolRef.current)) tasks.push(getPoolSnapshot(activePoolRef.current))
        const [nextNetwork, nextRequests, nextPool] = await Promise.all(tasks)
        setNetwork(nextNetwork)
        setRequests(ownRequests(nextRequests.requests ?? []))
        if (nextPool?.pool) setPoolState(nextPool.pool)
        setError('')
      } catch (refreshError) {
        setError(refreshError.message)
      }
    }, 180)
  }

  useEffect(() => {
    let active = true
    const savedView = readSavedView()
    const savedRequestId = readSavedRequestId()
    const shouldRestoreRequest = savedRequestId && ['proposals', 'compare', 'pool', 'review'].includes(savedView)
    Promise.all([
      listFreightRequests(),
      getRailpoolNetwork(),
      shouldRestoreRequest ? getFreightRequest(savedRequestId) : Promise.resolve(null),
    ])
      .then(([requestResult, networkResult, savedRequest]) => {
        if (!active) return
        setRequests(ownRequests(requestResult.requests ?? []))
        setNetwork(demoMode ? buildDemoNetwork(savedRequestId) : networkResult)
        if (demoMode) setLiveStatus('live')
        if (savedRequest) {
          setRequestInput(savedRequest.requestInput ?? {})
          setBaseline(savedRequest.baseline)
          setProposals(savedRequest.proposals ?? [])
          setSelectedProposal(savedRequest.proposals?.[0] ?? null)
          if (savedRequest.pool) {
            activePoolRef.current = savedRequestId
            setPoolState(demoMode ? resetDemoPool(savedRequest.pool) : savedRequest.pool)
          } else if (['pool', 'review'].includes(savedView)) {
            navigate('proposals')
          }
        }
        setError('')
      })
      .catch((initialError) => active && setError(initialError.message))

    if (demoMode) return () => {
      active = false
      window.clearTimeout(refreshTimerRef.current)
    }

    const unsubscribe = subscribeRailpoolEvents({
      onConnected: () => active && setLiveStatus('live'),
      onEvent: (event) => {
        if (!active) return
        if (event.network) setNetwork(event.network)
        scheduleLiveRefresh(event)
      },
      onError: (streamError) => {
        if (!active) return
        setLiveStatus('reconnecting')
        setError(streamError.message)
      },
    })
    return () => {
      active = false
      unsubscribe()
      window.clearTimeout(refreshTimerRef.current)
    }
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    bodyRef.current?.scrollTo({ top: 0, behavior: 'auto' })
    bodyRef.current?.focus({ preventScroll: true })
  }, [view])

  useEffect(() => {
    if (!cancelDialogOpen) return undefined
    const frame = window.requestAnimationFrame(() => cancelDialogRef.current?.querySelector('button')?.focus())
    return () => {
      window.cancelAnimationFrame(frame)
      cancelTriggerRef.current?.focus()
    }
  }, [cancelDialogOpen])

  const header = TITLES[view] ?? TITLES.dashboard
  const activeTab = useMemo(() => view === 'request' ? 'request' : view === 'disruption' ? 'notifications' : 'dashboard', [view])

  const resetDemoState = () => {
    if (!demoMode) return false
    setDemoPush('')
    setNetwork(buildDemoNetwork(requestId))
    setPoolState((current) => resetDemoPool(current))
    return true
  }

  const fireDemoEvent = (value) => {
    if (!demoMode) return false
    const eventNumber = Number(value)
    if (eventNumber === 0) return resetDemoState()
    if (eventNumber === 1) {
      setPoolState((current) => {
        const base = resetDemoPool(current)
        if (!base) return base
        return {
          ...base,
          currentTeu: 18,
          unitCost: 607_500,
          status: 'target_reached',
          participants: [...base.participants, {
            id: 'demo-video-join',
            agentId: 'shipper-05',
            name: '화주 05',
            region: '충북권',
            teu: 3,
            status: '확정',
            mine: false,
            joinedAt: DEMO_EVENT_TIME,
            updatedAt: DEMO_EVENT_TIME,
          }],
        }
      })
      setNetwork((current) => ({
        ...buildDemoNetwork(requestId),
        recentEvents: [{
          id: 'demo-pool-joined',
          agentId: 'shipper-05',
          type: 'pool_joined',
          requestId,
          createdAt: DEMO_EVENT_TIME,
          payload: { region: '충북권', joinedTeu: 3, currentTeu: 18, targetTeu: 18 },
        }, ...(current.recentEvents ?? []).filter((event) => event.id !== 'demo-pool-joined').slice(0, 7)],
      }))
      return true
    }
    if (eventNumber === 2) {
      setPoolState((current) => resetDemoPool(current))
      setNetwork((current) => ({
        ...buildDemoNetwork(requestId),
        recentEvents: [{
          id: 'demo-pool-left',
          agentId: 'shipper-05',
          type: 'pool_left',
          requestId,
          createdAt: DEMO_EVENT_TIME,
          payload: { region: '충북권', leftTeu: 3, currentTeu: 15, targetTeu: 18 },
        }, ...(current.recentEvents ?? []).filter((event) => event.id !== 'demo-pool-left').slice(0, 7)],
      }))
      return true
    }
    if (eventNumber === 3) {
      setDemoPush('함께 보내기 변동이 도착했습니다. 눌러서 최근 참여·이탈 내역을 확인하세요.')
      return true
    }
    return false
  }

  useEffect(() => {
    if (!demoMode) return undefined
    const api = { fire: fireDemoEvent, reset: resetDemoState }
    window.__demo = api
    const handleKeyDown = (event) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) return
      if (/^[0-3]$/.test(event.key)) fireDemoEvent(event.key)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (window.__demo === api) delete window.__demo
    }
  }, [demoMode, requestId])

  const goBack = () => {
    if (view === 'dashboard') return onExit()
    if (view === 'compare') return navigate('proposals')
    if (view === 'review') return navigate('pool')
    navigate('dashboard')
  }

  const loadRequest = async (request, destinationView) => {
    setBusy(true)
    setError('')
    try {
      const result = await getFreightRequest(request.id)
      rememberRequest(request.id)
      setRequestInput(result.requestInput ?? {})
      setBaseline(result.baseline)
      setProposals(result.proposals ?? [])
      setSelectedProposal(result.proposals?.[0] ?? null)
      if (result.pool) {
        activePoolRef.current = request.id
        setPoolState(demoMode ? resetDemoPool(result.pool) : result.pool)
      }
      navigate(destinationView ?? (result.pool ? 'pool' : 'proposals'))
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setBusy(false)
    }
  }

  const extract = async (text) => {
    setBusy(true)
    setError('')
    try {
      return await extractFreightConditions(text)
    } catch (extractError) {
      setError(extractError.message)
      throw extractError
    } finally {
      setBusy(false)
    }
  }

  const analyze = async (form) => {
    setBusy(true)
    setError('')
    try {
      const result = await createAndAnalyzeFreightRequest(form)
      rememberOwnRequest(result.request.id)
      rememberRequest(result.request.id)
      setRequestInput(form)
      setBaseline(result.baseline)
      setProposals(result.proposals ?? [])
      setSelectedProposal(result.proposals?.[0] ?? null)
      await refreshRequests()
      navigate('proposals')
    } catch (analyzeError) {
      setError(analyzeError.message)
    } finally {
      setBusy(false)
    }
  }

  const proceed = async (proposal) => {
    setBusy(true)
    setError('')
    try {
      const result = await saveProposalDecision(requestId, proposal.id, 'accepted')
      setSelectedProposal(proposal)
      activePoolRef.current = requestId
      setPoolState(demoMode ? resetDemoPool(result.pool) : result.pool)
      navigate('pool')
    } catch (decisionError) {
      setError(decisionError.message)
    } finally {
      setBusy(false)
    }
  }

  const reject = async (proposal, reason) => {
    try {
      await saveProposalDecision(requestId, proposal.id, 'rejected', reason)
      setProposals((items) => [...items.filter((item) => item.id !== proposal.id), proposal])
      onNotify?.(`${reason} 의견을 저장하고 다른 제안을 보여드립니다`)
    } catch (rejectError) {
      setError(rejectError.message)
    }
  }

  const submitReview = async (payload) => {
    setBusy(true)
    setError('')
    try {
      return await submitReviewRequest(requestId, payload)
    } catch (reviewError) {
      setError(reviewError.message)
      throw reviewError
    } finally {
      setBusy(false)
    }
  }

  const cancelPlan = async () => {
    setCancelDialogOpen(false)
    setBusy(true)
    try {
      await saveProposalDecision(requestId, selectedProposal.id, 'cancelled', '사용자 취소')
      setPoolState(null)
      activePoolRef.current = ''
      window.sessionStorage.removeItem('railpool:requestId')
      await refreshRequests()
      onNotify?.('함께 보내기 참여를 취소했습니다')
      navigate('dashboard')
    } catch (cancelError) {
      setError(cancelError.message)
    } finally {
      setBusy(false)
    }
  }

  const openCancelDialog = (event) => {
    cancelTriggerRef.current = event?.currentTarget ?? document.activeElement
    setCancelDialogOpen(true)
  }

  const handleCancelDialogKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setCancelDialogOpen(false)
      return
    }
    if (event.key !== 'Tab') return
    const buttons = [...(cancelDialogRef.current?.querySelectorAll('button:not([disabled])') ?? [])]
    const first = buttons[0]
    const last = buttons.at(-1)
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  const openPoolFromAlert = async () => {
    const relatedId = network.recentEvents?.find((event) => event.requestId)?.requestId || requestId
    const relatedRequest = requests.find((item) => item.id === relatedId)
    if (relatedRequest) await loadRequest(relatedRequest, 'pool')
    else navigate('dashboard')
  }

  const handleBottomNavigation = (destination) => {
    navigate(destination)
  }

  return (
    <div className={`rp-app ${demoMode ? 'is-demo-mode' : ''}`}>
      <span className="rp-sr-only" aria-live="polite" aria-atomic="true">{header[0]} 화면 · {liveStatus === 'live' ? '실시간 연결됨' : '연결 확인 중'}</span>
      <RailHeader title={header[0]} eyebrow={header[1]} onBack={goBack} />
      {demoPush && <button type="button" className="rp-demo-push" aria-label="함께 보내기 푸시 알림 열기" onClick={() => { setDemoPush(''); navigate('disruption') }}><span>RAILPOOL AI</span><strong>함께 보내기 변동 알림</strong><small>{demoPush}</small></button>}
      <main ref={bodyRef} className={`rp-screen-body rp-screen-body--${view}`} tabIndex="-1" aria-label={`${header[0]} 화면`} aria-busy={busy}>
        {error && <div className="rp-connection-error" role="status">{error}</div>}
        {busy && view === 'request' && <div className="rp-loading-layer"><LoadingPanel /></div>}
        {view === 'dashboard' && <DashboardScreen requests={requests} network={network} liveStatus={liveStatus} busy={busy} onCreateRequest={() => navigate('request')} onOpenRequest={(request) => loadRequest(request)} onOpenPool={(request) => loadRequest(request, 'pool')} onOpenNotifications={() => navigate('disruption')} />}
        {view === 'request' && <RequestScreen onAnalyze={analyze} onExtract={extract} busy={busy} demoMode={demoMode} />}
        {view === 'proposals' && baseline && proposals.length > 0 && <ProposalsScreen baseline={baseline} proposals={proposals} onProceed={proceed} onCompare={(proposal) => { setSelectedProposal(proposal); navigate('compare') }} onReject={reject} onModify={() => navigate('request')} />}
        {view === 'compare' && baseline && selectedProposal && <ComparisonScreen baseline={baseline} proposals={proposals} initialProposal={selectedProposal} onBack={() => navigate('proposals')} onProceed={proceed} />}
        {view === 'pool' && selectedProposal && poolState && <PoolScreen proposal={selectedProposal} pool={poolState} network={network} onReview={() => navigate('review')} onModify={() => navigate('request')} onDisruption={() => navigate('disruption')} onCancel={openCancelDialog} busy={busy} demoMode={demoMode} />}
        {view === 'disruption' && <DisruptionScreen network={network} pool={poolState} onOpenPool={openPoolFromAlert} onLeave={() => navigate('dashboard')} />}
        {view === 'review' && selectedProposal && <ReviewScreen requestId={requestId} requestInput={requestInput} pool={poolState} proposal={selectedProposal} onSubmit={submitReview} onDone={() => navigate('dashboard')} busy={busy} />}
      </main>
      <RailBottomNav active={activeTab} unread={demoMode ? 1 : network.recentEvents?.some((event) => event.type === 'pool_left') ? 1 : 0} onNavigate={handleBottomNavigation} />
      {cancelDialogOpen && (
        <div className="rp-modal-layer" role="presentation" onMouseDown={() => setCancelDialogOpen(false)}>
          <section ref={cancelDialogRef} className="rp-modal rp-cancel-modal" role="dialog" aria-modal="true" aria-labelledby="cancel-plan-title" aria-describedby="cancel-plan-description" onKeyDown={handleCancelDialogKeyDown} onMouseDown={(event) => event.stopPropagation()}>
            <i className="rp-sheet-handle" />
            <button type="button" className="rp-modal-close" aria-label="취소 확인 닫기" onClick={() => setCancelDialogOpen(false)}>×</button>
            <span className="rp-modal__step">함께 보내기 참여 취소</span>
            <h2 id="cancel-plan-title">이 계획을 취소할까요?</h2>
            <p id="cancel-plan-description">출발 전에는 비용 없이 취소할 수 있습니다. 취소하면 현재 함께 보내기 참여가 종료됩니다.</p>
            <div className="rp-cancel-modal__actions">
              <SecondaryButton onClick={() => setCancelDialogOpen(false)}>계속 참여하기</SecondaryButton>
              <PrimaryButton onClick={cancelPlan} disabled={busy}>계획 취소하기</PrimaryButton>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

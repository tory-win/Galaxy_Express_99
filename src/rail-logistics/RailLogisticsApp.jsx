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
import { LoadingPanel, RailBottomNav, RailHeader } from './components.jsx'
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
  request: ['새 운송 요청', '레일물류'],
  proposals: ['운송 제안', '레일물류'],
  compare: ['제안 비교', '레일물류'],
  pool: ['함께 보내기', '레일물류'],
  disruption: ['변동 알림', '레일물류'],
  review: ['코레일 검토 요청', '레일물류'],
}

const EMPTY_NETWORK = { totalAgents: 0, activeAgents: 0, agents: [], recentEvents: [] }

function readSavedView() {
  const saved = window.sessionStorage.getItem('railpool:view')
  return TITLES[saved] ? saved : 'dashboard'
}

function readSavedRequestId() {
  return window.sessionStorage.getItem('railpool:requestId') ?? ''
}

export function RailLogisticsApp({ onExit, onNotify }) {
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
  const [alimtalk, setAlimtalk] = useState(null)
  const bodyRef = useRef(null)
  const activePoolRef = useRef('')
  const refreshTimerRef = useRef(null)
  const alimtalkTimerRef = useRef(null)
  const previousPoolRef = useRef(null)

  const previewAlimtalk = (title, message) => {
    window.clearTimeout(alimtalkTimerRef.current)
    setAlimtalk({ title, message })
    alimtalkTimerRef.current = window.setTimeout(() => setAlimtalk(null), 4_500)
  }

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
    setRequests(result.requests ?? [])
  }

  const refreshPool = async (id = activePoolRef.current) => {
    if (!id) return
    const result = await getPoolSnapshot(id)
    setPoolState(result.pool)
  }

  const scheduleLiveRefresh = (event) => {
    window.clearTimeout(refreshTimerRef.current)
    refreshTimerRef.current = window.setTimeout(async () => {
      try {
        const tasks = [getRailpoolNetwork(), listFreightRequests()]
        if (activePoolRef.current && (!event.requestId || event.requestId === activePoolRef.current)) tasks.push(getPoolSnapshot(activePoolRef.current))
        const [nextNetwork, nextRequests, nextPool] = await Promise.all(tasks)
        setNetwork(nextNetwork)
        setRequests(nextRequests.requests ?? [])
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
        setRequests(requestResult.requests ?? [])
        setNetwork(networkResult)
        if (savedRequest) {
          setRequestInput(savedRequest.requestInput ?? {})
          setBaseline(savedRequest.baseline)
          setProposals(savedRequest.proposals ?? [])
          setSelectedProposal(savedRequest.proposals?.[0] ?? null)
          if (savedRequest.pool) {
            activePoolRef.current = savedRequestId
            setPoolState(savedRequest.pool)
          } else if (['pool', 'review'].includes(savedView)) {
            navigate('proposals')
          }
        }
        setError('')
      })
      .catch((initialError) => active && setError(initialError.message))

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
      window.clearTimeout(alimtalkTimerRef.current)
    }
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    bodyRef.current?.scrollTo({ top: 0, behavior: 'auto' })
    bodyRef.current?.focus({ preventScroll: true })
  }, [view])

  useEffect(() => {
    if (!poolState) {
      previousPoolRef.current = null
      return
    }
    const previous = previousPoolRef.current
    previousPoolRef.current = { currentTeu: poolState.currentTeu, status: poolState.status }
    if (!previous || previous.currentTeu === poolState.currentTeu) return
    const filled = poolState.currentTeu >= poolState.targetTeu
    previewAlimtalk(
      filled ? '함께 보내기 목표 달성' : '모집 진행 상황 변경',
      filled ? '목표 물량을 채웠습니다. 코레일 검토를 요청할 수 있습니다.' : `현재 ${poolState.currentTeu}/${poolState.targetTeu}TEU가 모였습니다.`,
    )
  }, [poolState?.currentTeu, poolState?.targetTeu, poolState?.status])

  const header = TITLES[view] ?? TITLES.dashboard
  const activeTab = useMemo(() => view === 'request' ? 'request' : view === 'disruption' ? 'notifications' : 'dashboard', [view])

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
        setPoolState(result.pool)
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
      rememberRequest(result.request.id)
      setRequestInput(form)
      setBaseline(result.baseline)
      setProposals(result.proposals ?? [])
      setSelectedProposal(result.proposals?.[0] ?? null)
      await refreshRequests()
      previewAlimtalk('운송 요청 접수 완료', `${form.origin} → ${form.destination} 요청이 접수되었습니다.`)
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
      setPoolState(result.pool)
      previewAlimtalk('진행 상황 변경', '선택한 제안으로 함께 보내기 모집을 시작했습니다.')
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
      setProposals((items) => [...items.slice(1), items[0]])
      onNotify?.(`${reason} 의견을 저장하고 다른 제안을 보여드립니다`)
    } catch (rejectError) {
      setError(rejectError.message)
    }
  }

  const submitReview = async (payload) => {
    setBusy(true)
    setError('')
    try {
      const result = await submitReviewRequest(requestId, payload)
      previewAlimtalk('코레일 검토 접수 완료', '담당자 검토가 접수되었습니다. 진행 상황과 확정 결과도 알려드립니다.')
      return result
    } catch (reviewError) {
      setError(reviewError.message)
      throw reviewError
    } finally {
      setBusy(false)
    }
  }

  const cancelPlan = async () => {
    if (!window.confirm('함께 보내기 참여를 취소할까요? 출발 전에는 비용 없이 취소할 수 있습니다.')) return
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

  const openPoolFromAlert = async () => {
    const relatedId = network.recentEvents?.find((event) => event.requestId)?.requestId || requestId
    const relatedRequest = requests.find((item) => item.id === relatedId)
    if (relatedRequest) await loadRequest(relatedRequest, 'pool')
    else navigate('dashboard')
  }

  return (
    <div className="rp-app">
      <span className="rp-sr-only" aria-live="polite" aria-atomic="true">{header[0]} 화면 · {liveStatus === 'live' ? '실시간 연결됨' : '연결 확인 중'}</span>
      <RailHeader title={header[0]} eyebrow={header[1]} onBack={goBack} onNotifications={() => navigate('disruption')} unread={network.recentEvents?.some((event) => event.type === 'pool_left') ? 1 : 0} />
      <main ref={bodyRef} className={`rp-screen-body rp-screen-body--${view}`} tabIndex="-1" aria-label={`${header[0]} 화면`} aria-busy={busy}>
        {error && <div className="rp-connection-error" role="status">{error}</div>}
        {busy && view === 'request' && <div className="rp-loading-layer"><LoadingPanel /></div>}
        {view === 'dashboard' && <DashboardScreen requests={requests} network={network} liveStatus={liveStatus} busy={busy} onNewRequest={() => navigate('request')} onOpenRequest={(request) => loadRequest(request)} onOpenPool={(request) => loadRequest(request, 'pool')} onOpenNotifications={() => navigate('disruption')} />}
        {view === 'request' && <RequestScreen onAnalyze={analyze} onExtract={extract} busy={busy} />}
        {view === 'proposals' && baseline && proposals.length > 0 && <ProposalsScreen baseline={baseline} proposals={proposals} onProceed={proceed} onCompare={(proposal) => { setSelectedProposal(proposal); navigate('compare') }} onReject={reject} onModify={() => navigate('request')} />}
        {view === 'compare' && baseline && selectedProposal && <ComparisonScreen baseline={baseline} proposals={proposals} initialProposal={selectedProposal} onBack={() => navigate('proposals')} onProceed={proceed} />}
        {view === 'pool' && selectedProposal && poolState && <PoolScreen proposal={selectedProposal} pool={poolState} network={network} onReview={() => navigate('review')} onModify={() => navigate('request')} onDisruption={() => navigate('disruption')} onCancel={cancelPlan} busy={busy} />}
        {view === 'disruption' && <DisruptionScreen network={network} pool={poolState} onOpenPool={openPoolFromAlert} onLeave={() => navigate('dashboard')} />}
        {view === 'review' && selectedProposal && <ReviewScreen requestId={requestId} requestInput={requestInput} pool={poolState} proposal={selectedProposal} onSubmit={submitReview} onDone={() => navigate('dashboard')} busy={busy} />}
      </main>
      <RailBottomNav active={activeTab} unread={network.recentEvents?.some((event) => event.type === 'pool_left') ? 1 : 0} onNavigate={navigate} />
      {alimtalk && (
        <aside className="rp-alimtalk-preview" role="status" aria-live="polite">
          <div className="rp-alimtalk-preview__head"><span>가상 알림톡</span><b>코레일톡</b><button type="button" aria-label="알림톡 미리보기 닫기" onClick={() => setAlimtalk(null)}>×</button></div>
          <strong>{alimtalk.title}</strong>
          <p>{alimtalk.message}</p>
          <small>시연용 화면 · 실제 메시지는 발송되지 않습니다</small>
        </aside>
      )}
    </div>
  )
}

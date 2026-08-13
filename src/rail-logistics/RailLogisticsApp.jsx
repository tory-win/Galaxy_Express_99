import { useEffect, useMemo, useRef, useState } from 'react'
import {
  acceptDisruptionProposal,
  createAndAnalyzeFreightRequest,
  extractFreightConditions,
  getPublicDataSources,
  listFreightRequests,
  saveProposalDecision,
  submitReviewRequest,
  triggerDemoFill,
} from './api.js'
import { DEMO_REQUEST, PROPOSALS } from './demoData.js'
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
  dashboard: ['RAILPOOL AI', '레일물류'],
  request: ['새 운송 요청', '레일물류'],
  proposals: ['AI 역제안', 'RAILPOOL AI'],
  compare: ['제안 비교', 'RAILPOOL AI'],
  pool: ['함께 보내기', '레일물류'],
  disruption: ['변동 알림', '레일물류'],
  review: ['코레일 검토 요청', '레일물류'],
}

function readSavedView() {
  const saved = window.sessionStorage.getItem('railpool:view')
  return TITLES[saved] ? saved : 'dashboard'
}

export function RailLogisticsApp({ onExit, onNotify }) {
  const [view, setView] = useState(readSavedView)
  const [requests, setRequests] = useState([DEMO_REQUEST])
  const [connected, setConnected] = useState(false)
  const [sourceCount, setSourceCount] = useState(0)
  const [requestId, setRequestId] = useState(DEMO_REQUEST.id)
  const [proposals, setProposals] = useState(PROPOSALS)
  const [selectedProposal, setSelectedProposal] = useState(PROPOSALS[0])
  const [currentTeu, setCurrentTeu] = useState(15)
  const [targetTeu] = useState(18)
  const [busy, setBusy] = useState(false)
  const bodyRef = useRef(null)

  const navigate = (nextView) => {
    const normalized = nextView === 'notifications' ? 'disruption' : nextView
    setView(normalized)
    window.sessionStorage.setItem('railpool:view', normalized)
  }

  useEffect(() => {
    let active = true
    Promise.all([listFreightRequests(), getPublicDataSources()]).then(([result, sources]) => {
      if (!active) return
      setRequests(result.requests?.length ? result.requests : [DEMO_REQUEST])
      setConnected(Boolean(result.connected))
      setSourceCount((sources.datasets ?? []).filter((dataset) => dataset.status === 'connected').length)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }, [view])

  const header = TITLES[view] ?? TITLES.dashboard
  const activeTab = useMemo(() => {
    if (view === 'request') return 'request'
    if (view === 'disruption') return 'notifications'
    return 'dashboard'
  }, [view])

  const goBack = () => {
    if (view === 'dashboard') return onExit()
    if (view === 'compare') return navigate('proposals')
    if (view === 'review') return navigate('pool')
    navigate('dashboard')
  }

  const extract = async (text) => {
    setBusy(true)
    try {
      const result = await extractFreightConditions(text)
      onNotify?.(result.source === 'ai' ? 'AI가 메일 조건을 인식했습니다' : '메일 조건 6개를 인식했습니다')
      return result
    } finally {
      setBusy(false)
    }
  }

  const analyze = async (form) => {
    setBusy(true)
    try {
      const [result] = await Promise.all([
        createAndAnalyzeFreightRequest(form),
        new Promise((resolve) => window.setTimeout(resolve, 1_050)),
      ])
      setRequestId(result.request?.id ?? DEMO_REQUEST.id)
      setProposals(result.proposals?.length ? result.proposals : PROPOSALS)
      setSelectedProposal(result.proposals?.[0] ?? PROPOSALS[0])
      setConnected(Boolean(result.connected))
      setSourceCount((result.sources?.datasets ?? []).filter((dataset) => dataset.status === 'connected').length || sourceCount)
      navigate('proposals')
    } finally {
      setBusy(false)
    }
  }

  const proceed = async (proposal) => {
    setSelectedProposal(proposal)
    setCurrentTeu(15)
    await saveProposalDecision(requestId, proposal.id, 'accepted')
    navigate('pool')
  }

  const reject = async (proposal, reason) => {
    await saveProposalDecision(requestId, proposal.id, 'rejected', reason)
    setProposals((items) => [...items.slice(1), items[0]])
    onNotify?.(`${reason} 조건을 잠그고 다시 계산했습니다`)
  }

  const fillPool = async () => {
    setBusy(true)
    try {
      const result = await triggerDemoFill(requestId)
      setCurrentTeu(result.currentTeu ?? 18)
      onNotify?.('새 참여사 3TEU가 합류해 목표 물량을 채웠습니다')
    } finally {
      setBusy(false)
    }
  }

  const acceptDisruption = async () => {
    setBusy(true)
    try {
      const result = await acceptDisruptionProposal(requestId)
      setCurrentTeu(result.currentTeu ?? 15)
      onNotify?.('새 참여사 조합으로 현황을 갱신했습니다')
      navigate('pool')
    } finally {
      setBusy(false)
    }
  }

  const submitReview = async (payload) => {
    setBusy(true)
    try {
      return await submitReviewRequest(requestId, payload)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rp-app">
      <RailHeader title={header[0]} eyebrow={header[1]} onBack={goBack} onNotifications={() => navigate('disruption')} />
      <main ref={bodyRef} className={`rp-screen-body rp-screen-body--${view}`}>
        {busy && view === 'request' && <div className="rp-loading-layer"><LoadingPanel /></div>}
        {view === 'dashboard' && <DashboardScreen requests={requests} connected={connected} sourceCount={sourceCount} onNewRequest={() => navigate('request')} onOpenRequest={() => navigate('proposals')} onOpenPool={() => navigate('pool')} onOpenNotifications={() => navigate('disruption')} />}
        {view === 'request' && <RequestScreen onAnalyze={analyze} onExtract={extract} busy={busy} />}
        {view === 'proposals' && <ProposalsScreen proposals={proposals} sourceCount={sourceCount} onProceed={proceed} onCompare={(proposal) => { setSelectedProposal(proposal); navigate('compare') }} onReject={reject} onModify={() => navigate('request')} />}
        {view === 'compare' && <ComparisonScreen proposals={proposals} initialProposal={selectedProposal} onBack={() => navigate('proposals')} onProceed={proceed} />}
        {view === 'pool' && <PoolScreen proposal={selectedProposal} currentTeu={currentTeu} targetTeu={targetTeu} onFill={fillPool} onReview={() => navigate('review')} onDisruption={() => navigate('disruption')} busy={busy} />}
        {view === 'disruption' && <DisruptionScreen onAccept={acceptDisruption} onCompare={() => navigate('compare')} onLeave={() => navigate('dashboard')} busy={busy} />}
        {view === 'review' && <ReviewScreen requestId={requestId} proposal={selectedProposal} onSubmit={submitReview} onDone={() => navigate('dashboard')} busy={busy} />}
      </main>
      <RailBottomNav active={activeTab} onNavigate={navigate} />
    </div>
  )
}

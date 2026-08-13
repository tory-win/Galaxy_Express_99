import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Box,
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Clock3,
  Command,
  Gauge,
  LoaderCircle,
  MapPin,
  Menu,
  PackageCheck,
  Route,
  Search,
  Send,
  Sparkles,
  Truck,
  Warehouse,
  X,
  Zap,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

const API = '/galaxy-express/api';

interface Summary {
  sampleData: boolean;
  generatedAt: string;
  metrics: { activeShipments: number; delayedShipments: number; averageUtilization: number; openAlerts: number };
  facilities: Array<{ code: string; name: string; facilityType: string; region: string; utilization: number; status: 'normal' | 'watch' | 'critical'; updatedAt: string }>;
  shipments: Array<{ trackingCode: string; originCode: string; destinationCode: string; cargoType: string; status: string; progress: number; eta: string; delayMinutes: number; updatedAt: string }>;
  alerts: Array<{ id: string; severity: 'info' | 'warning' | 'critical'; title: string; description: string; source: string; status: string; createdAt: string }>;
}

interface Session { name: string; csrf: string; expiresAt: number }
interface Message { role: 'user' | 'assistant'; content: string }

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, { ...init, credentials: 'include', headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers } });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  return response.json() as Promise<T>;
}

function App() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const [nextSummary, nextSession] = await Promise.all([
          getJson<Summary>('/product/operations/summary'),
          getJson<Session>('/session'),
        ]);
        if (!stopped) { setSummary(nextSummary); setSession(nextSession); setError(''); }
      } catch {
        if (!stopped) setError('운영 데이터를 불러오지 못했어요. 제품 API 연결을 확인해주세요.');
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 15_000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, []);

  const shipments = useMemo(() => summary?.shipments.filter((shipment) => `${shipment.trackingCode} ${shipment.originCode} ${shipment.destinationCode} ${shipment.cargoType}`.toLowerCase().includes(filter.toLowerCase())) ?? [], [filter, summary]);

  if (error) return <div className="product-error"><AlertTriangle size={30} /><strong>연결 확인이 필요해요</strong><span>{error}</span></div>;
  if (!summary || !session) return <div className="product-loading"><LoaderCircle className="spin" size={24} /> 운영 네트워크 동기화 중</div>;

  return (
    <div className="product-shell">
      <header className="product-header">
        <a className="product-brand" href="#top"><span className="product-logo"><Route size={22} /></span><div><strong>GALAXY</strong><small>EXPRESS 99</small></div></a>
        <nav className={mobileNav ? 'open' : ''}>
          <a className="active" href="#control" onClick={() => setMobileNav(false)}>Control Tower</a>
          <a href="#shipments" onClick={() => setMobileNav(false)}>Shipments</a>
          <a href="#network" onClick={() => setMobileNav(false)}>Network</a>
          <a href="#copilot" onClick={() => setMobileNav(false)}>AI Copilot</a>
        </nav>
        <div className="header-actions"><span className="sample-chip">개발 샘플</span><button className="header-user">{session.name.slice(0, 1)}</button><button className="mobile-menu" onClick={() => setMobileNav((value) => !value)}>{mobileNav ? <X /> : <Menu />}</button></div>
      </header>

      <main id="top">
        <section className="hero" id="control">
          <div><span className="hero-kicker"><i /> LIVE OPERATIONS · {timeOnly(summary.generatedAt)}</span><h1>물류의 모든 순간을<br /><em>하나의 흐름으로.</em></h1><p>실시간 운송, 허브 용량, 지연 리스크를 연결하고<br />AI와 함께 다음 결정을 앞당깁니다.</p></div>
          <div className="hero-network" aria-hidden="true"><span className="network-node n1"><Warehouse /></span><span className="network-node n2"><Truck /></span><span className="network-node n3"><Box /></span><span className="network-node n4"><MapPin /></span><i className="network-line l1" /><i className="network-line l2" /><i className="network-line l3" /><i className="network-line l4" /><div className="network-core"><Route size={31} /><strong>99</strong></div></div>
        </section>

        <section className="kpi-grid">
          <Kpi icon={<Truck />} label="운송 중" value={summary.metrics.activeShipments} suffix="건" tone="lime" delta="실시간 관제" />
          <Kpi icon={<Clock3 />} label="지연 감지" value={summary.metrics.delayedShipments} suffix="건" tone="orange" delta="즉시 확인 필요" />
          <Kpi icon={<Gauge />} label="평균 허브 가동률" value={summary.metrics.averageUtilization} suffix="%" tone="blue" delta="3개 거점 기준" />
          <Kpi icon={<AlertTriangle />} label="열린 경보" value={summary.metrics.openAlerts} suffix="건" tone="red" delta="우선순위 순" />
        </section>

        <div className="dashboard-grid">
          <section className="product-card shipment-section" id="shipments">
            <div className="section-title"><div><span>LIVE SHIPMENTS</span><h2>운송 흐름</h2></div><label className="search-box"><Search size={15} /><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="운송장 검색" /></label></div>
            <div className="shipment-table">
              <div className="table-head"><span>운송장 / 화물</span><span>경로</span><span>진행</span><span>도착 예정</span><span>상태</span></div>
              {shipments.map((shipment) => <div className="shipment-row" key={shipment.trackingCode}><div><strong>{shipment.trackingCode}</strong><small>{shipment.cargoType}</small></div><div className="route-cell"><b>{shipment.originCode}</b><span><i style={{ width: `${shipment.progress}%` }} /></span><b>{shipment.destinationCode}</b></div><div className="progress-value">{shipment.progress}%</div><div><strong>{etaLabel(shipment.eta)}</strong><small>{shipment.delayMinutes ? `+${shipment.delayMinutes}분 지연` : '정시 예상'}</small></div><Status status={shipment.status} /></div>)}
            </div>
          </section>

          <section className="product-card alert-section">
            <div className="section-title"><div><span>RISK SIGNALS</span><h2>우선 경보</h2></div><button><ChevronDown size={16} /></button></div>
            <div className="alert-list">{summary.alerts.map((alert) => <article className={`alert ${alert.severity}`} key={alert.id}><span className="alert-icon">{alert.severity === 'critical' ? <Zap /> : <AlertTriangle />}</span><div><strong>{alert.title}</strong><p>{alert.description}</p><small><MapPin size={11} /> {alert.source} · {relativeTime(alert.createdAt)}</small></div><ArrowRight size={16} /></article>)}</div>
          </section>
        </div>

        <section className="network-section" id="network">
          <div className="section-title wide"><div><span>FACILITY NETWORK</span><h2>거점 가동 현황</h2></div><p>용량이 85%를 넘으면 선제적인 우회 검토가 필요합니다.</p></div>
          <div className="facility-grid">{summary.facilities.map((facility) => <article className={`facility-card ${facility.status}`} key={facility.code}><header><span>{facility.facilityType === 'hub' ? <Building2 /> : facility.facilityType === 'gateway' ? <Route /> : <Warehouse />}</span><div><strong>{facility.name}</strong><small>{facility.code} · {facility.region}</small></div><i /></header><div className="utilization"><div><span>CAPACITY</span><strong>{facility.utilization}%</strong></div><div className="gauge-track"><i style={{ width: `${facility.utilization}%` }} /></div></div><footer><PackageCheck size={14} /> {facility.status === 'normal' ? '정상 운영' : facility.status === 'watch' ? '용량 관찰' : '우회 필요'}</footer></article>)}</div>
        </section>

        <Copilot session={session} summary={summary} />
      </main>
      <footer className="product-footer"><div className="product-brand compact"><span className="product-logo"><Route size={17} /></span><div><strong>GALAXY EXPRESS 99</strong><small>LOGISTICS OPERATING SYSTEM</small></div></div><span>Hackathon prototype · sample operational data</span></footer>
    </div>
  );
}

function Copilot({ session, summary }: { session: Session; summary: Summary }) {
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: `현재 ${summary.metrics.openAlerts}개의 경보를 감지했어요. 어떤 운영 판단을 도와드릴까요?` }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const ask = async (event: FormEvent) => {
    event.preventDefault(); const content = input.trim(); if (!content || loading) return;
    const next: Message[] = [...messages, { role: 'user', content }]; setMessages(next); setInput(''); setLoading(true);
    try { const result = await getJson<{ reply?: string; fallback?: string }>('/product/ai/chat', { method: 'POST', headers: { 'x-gx99-csrf': session.csrf }, body: JSON.stringify({ messages: next.slice(-12) }) }); setMessages((current) => [...current, { role: 'assistant', content: result.reply ?? result.fallback ?? '답변을 만들지 못했어요.' }]); }
    catch { setMessages((current) => [...current, { role: 'assistant', content: 'AI 연결이 잠시 불안정해요. 운영 현황은 계속 사용할 수 있어요.' }]); }
    finally { setLoading(false); }
  };
  return <section className="copilot" id="copilot"><div className="copilot-intro"><span className="copilot-orb"><Sparkles /></span><span className="hero-kicker">AI OPERATIONS COPILOT</span><h2>데이터를 보고,<br />다음 행동을 묻다.</h2><p>8318 AI 게이트웨이가 현재 운영 스냅샷을 바탕으로 판단을 지원합니다. 질문과 답변은 서버에 저장하지 않습니다.</p><div className="suggestions"><button onClick={() => setInput('지연된 운송의 우선 대응 순서를 알려줘')}>지연 대응 순서</button><button onClick={() => setInput('허브 용량을 분산할 방안을 제안해줘')}>용량 분산 방안</button></div></div><div className="chat-panel"><header><span><Bot size={18} /> GX99 Copilot</span><i>ONLINE</i></header><div className="messages">{messages.map((message, index) => <div className={`message ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === 'assistant' ? <Bot size={14} /> : session.name.slice(0, 1)}</span><p>{message.content}</p></div>)}{loading ? <div className="message assistant"><span><Bot size={14} /></span><p className="typing"><i /><i /><i /></p></div> : null}</div><form onSubmit={(event) => void ask(event)}><input value={input} onChange={(event) => setInput(event.target.value)} maxLength={4000} placeholder="현재 운영 상황에 대해 질문하세요" /><button disabled={!input.trim() || loading}><Send size={16} /></button></form><small><Command size={12} /> AI 판단은 제안이며 실제 배차·운영 변경은 담당자가 승인합니다.</small></div></section>;
}

function Kpi({ icon, label, value, suffix, tone, delta }: { icon: React.ReactNode; label: string; value: number; suffix: string; tone: string; delta: string }) { return <article className={`kpi ${tone}`}><span className="kpi-icon">{icon}</span><div><small>{label}</small><strong>{value}<em>{suffix}</em></strong><span><i /> {delta}</span></div></article>; }
function Status({ status }: { status: string }) { const map: Record<string, { label: string; icon: React.ReactNode }> = { planned: { label: '출발 예정', icon: <CircleDot /> }, in_transit: { label: '운송 중', icon: <Truck /> }, delayed: { label: '지연', icon: <AlertTriangle /> }, delivered: { label: '배송 완료', icon: <CheckCircle2 /> } }; const item = map[status] ?? map.planned!; return <span className={`shipment-status ${status}`}>{item.icon}{item.label}</span>; }
function etaLabel(value: string): string { return new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function timeOnly(value: string): string { return new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(value)); }
function relativeTime(value: string): string { const minutes = Math.round((new Date(value).getTime() - Date.now()) / 60_000); return new Intl.RelativeTimeFormat('ko', { numeric: 'auto' }).format(Math.abs(minutes) < 60 ? minutes : Math.round(minutes / 60), Math.abs(minutes) < 60 ? 'minute' : 'hour'); }

export default App;

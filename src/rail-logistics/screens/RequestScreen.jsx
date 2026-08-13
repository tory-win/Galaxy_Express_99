import { useMemo, useState } from 'react'
import { AXIS_OPTIONS, DEFAULT_FORM, DEMO_EMAIL, formatManWon } from '../demoData.js'
import { ConfidenceBadge, Icon, PrimaryButton, SecondaryButton, SectionHeading } from '../components.jsx'

function Field({ label, required = false, hint, children, evidence }) {
  return (
    <label className="rp-field">
      <span className="rp-field__label">{label}{required && <b>필수</b>}{hint && <small>{hint}</small>}</span>
      {children}
      {evidence && <em className="rp-evidence"><Icon name="spark" size={11} /> {evidence}</em>}
    </label>
  )
}

function StepIndicator({ step }) {
  return (
    <div className="rp-stepper" aria-label={`3단계 중 ${step}단계`}>
      {[1, 2, 3].map((item) => <span key={item} className={item <= step ? 'is-active' : ''}><i>{item < step ? '✓' : item}</i>{['기본 정보', '검토 범위', '확인'][item - 1]}</span>)}
    </div>
  )
}

export function RequestScreen({ onAnalyze, onExtract, busy }) {
  const [step, setStep] = useState(1)
  const [mode, setMode] = useState('email')
  const [emailText, setEmailText] = useState('')
  const [form, setForm] = useState(DEFAULT_FORM)
  const [evidence, setEvidence] = useState({})
  const [extracted, setExtracted] = useState(false)
  const [error, setError] = useState('')

  const update = (name, value) => setForm((current) => ({ ...current, [name]: value }))
  const updateAxis = (id, value) => setForm((current) => ({ ...current, axes: { ...current.axes, [id]: value } }))
  const toggleLock = (id) => setForm((current) => ({
    ...current,
    lockedAxes: current.lockedAxes.includes(id)
      ? current.lockedAxes.filter((item) => item !== id)
      : [...current.lockedAxes, id],
  }))

  const opportunityCount = useMemo(() => {
    const open = AXIS_OPTIONS.filter((axis) => !form.lockedAxes.includes(axis.id) && !['불가', '지정한 곳만', '기존 유지'].includes(form.axes[axis.id])).length
    return Math.min(5, Math.max(1, open - 1))
  }, [form.axes, form.lockedAxes])

  const handleExtract = async () => {
    if (!emailText.trim()) {
      setError('메일이나 발주서 내용을 붙여넣어 주세요.')
      return
    }
    setError('')
    const result = await onExtract(emailText)
    setForm((current) => ({ ...current, ...result.fields, axes: { ...current.axes, ...(result.fields.axes ?? {}) } }))
    setEvidence(result.evidence ?? {})
    setExtracted(true)
  }

  const validateBasic = () => {
    const missing = ['origin', 'destination', 'departureDate', 'deadline'].filter((key) => !form[key])
    if (missing.length) {
      setError(`필수 항목 ${missing.length}개가 남았습니다.`)
      return false
    }
    if (!form.hazardous) {
      setError('위험물 여부를 확인해 주세요.')
      return false
    }
    setError('')
    return true
  }

  const next = () => {
    if (step === 1 && !validateBasic()) return
    setStep((current) => Math.min(3, current + 1))
  }

  return (
    <div className="rp-request-screen">
      <StepIndicator step={step} />

      {step === 1 && (
        <>
          <SectionHeading eyebrow="STEP 1" title="보내실 화물을 알려주세요" />
          <div className="rp-segmented" role="tablist">
            <button type="button" className={mode === 'direct' ? 'is-active' : ''} onClick={() => setMode('direct')}>직접 입력</button>
            <button type="button" className={mode === 'email' ? 'is-active' : ''} onClick={() => setMode('email')}>이메일·문서 붙여넣기</button>
          </div>

          {mode === 'email' && (
            <section className="rp-paste-card">
              <div className="rp-paste-card__heading"><span><Icon name="mail" size={17} /></span><div><strong>사내 메일을 그대로 붙여넣으세요</strong><small>원문에 없는 값은 만들지 않고 확인 필요로 남깁니다.</small></div></div>
              <textarea value={emailText} onChange={(event) => setEmailText(event.target.value)} placeholder="출발지, 도착지, 수량, 날짜가 포함된 메일 내용을 붙여넣어 주세요." />
              <button type="button" className="rp-sample-button" onClick={() => setEmailText(DEMO_EMAIL)}>시연용 메일 불러오기</button>
              <PrimaryButton disabled={busy || !emailText.trim()} onClick={handleExtract}>{busy ? '조건을 읽는 중…' : 'AI로 조건 자동 인식'}</PrimaryButton>
              {extracted && (
                <div className="rp-extracted-summary">
                  <strong><Icon name="check" size={14} /> 6개 필수 항목을 인식했습니다</strong>
                  <p>{form.origin} → {form.destination} · {form.containerSize} × {form.containerCount}</p>
                  <div><ConfidenceBadge kind="확인 완료" compact /><span>원문 근거를 함께 저장했습니다</span></div>
                  <SecondaryButton onClick={() => setMode('direct')}>인식 결과 확인·수정</SecondaryButton>
                </div>
              )}
            </section>
          )}

          {mode === 'direct' && (
            <div className="rp-form-grid">
              <Field label="출발지" required evidence={evidence.origin}>
                <input value={form.origin} onChange={(event) => update('origin', event.target.value)} placeholder="주소 또는 지역" />
              </Field>
              <Field label="도착지" required evidence={evidence.destination}>
                <input value={form.destination} onChange={(event) => update('destination', event.target.value)} placeholder="목적지" />
              </Field>
              <div className="rp-field-row">
                <Field label="컨테이너" required evidence={evidence.containerCount}>
                  <select value={form.containerSize} onChange={(event) => update('containerSize', event.target.value)}><option>20ft</option><option>40ft</option></select>
                </Field>
                <Field label="수량" required>
                  <div className="rp-number-input"><input type="number" min="1" value={form.containerCount} onChange={(event) => {
                    const count = Number(event.target.value)
                    setForm((current) => ({ ...current, containerCount: count, teu: current.containerSize === '40ft' ? count * 2 : count }))
                  }} /><span>{form.teu}TEU</span></div>
                </Field>
              </div>
              <Field label="희망 출발일" required evidence={evidence.departureDate}><input type="date" value={form.departureDate} onChange={(event) => update('departureDate', event.target.value)} /></Field>
              <Field label="도착 마감" required evidence={evidence.deadline}><input type="datetime-local" value={form.deadline} onChange={(event) => update('deadline', event.target.value)} /></Field>
              <Field label="위험물 여부" required evidence={evidence.hazardous}>
                <div className="rp-choice-row">
                  {[['no', '아니오'], ['yes', '예']].map(([value, label]) => <button type="button" key={value} className={form.hazardous === value ? 'is-active' : ''} onClick={() => update('hazardous', value)}>{label}</button>)}
                </div>
              </Field>
              {form.hazardous === 'yes' && <div className="rp-danger-note"><Icon name="alert" size={18} /><div><strong>위험물은 별도 검토가 필요합니다</strong><p>자동 계산을 중단하고 코레일 담당자가 취급 가능 여부를 확인합니다.</p></div></div>}
              <details className="rp-optional-fields" open>
                <summary>정확도를 높이는 참고 정보</summary>
                <Field label="현재 도로 운송비"><div className="rp-number-input"><input type="number" step="10000" value={form.roadCost} onChange={(event) => update('roadCost', Number(event.target.value))} /><span>원</span></div></Field>
                <div className="rp-field-row">
                  <Field label="화물 무게"><div className="rp-number-input"><input type="number" value={form.weightTons} onChange={(event) => update('weightTons', Number(event.target.value))} /><span>톤</span></div></Field>
                  <Field label="반복 발송"><select value={form.frequency} onChange={(event) => update('frequency', event.target.value)}><option>일회성</option><option>주 1회</option><option>월 2회</option></select></Field>
                </div>
                <Field label="화물 품목"><input value={form.cargo} onChange={(event) => update('cargo', event.target.value)} /></Field>
              </details>
          </div>
          )}
        </>
      )}

      {step === 2 && (
        <>
          <SectionHeading eyebrow="STEP 2" title="어디까지 검토해볼까요?" />
          <p className="rp-section-copy">포기할 조건을 고르는 것이 아니라, AI가 살펴볼 범위를 넓히는 단계입니다.</p>
          <div className="rp-axis-list">
            {AXIS_OPTIONS.map((axis) => (
              <section className={`rp-axis-card ${form.lockedAxes.includes(axis.id) ? 'is-locked' : ''}`} key={axis.id}>
                <div className="rp-axis-card__head">
                  <div><strong>{axis.label}</strong><small>{axis.helper}</small></div>
                  <button type="button" className="rp-lock-button" onClick={() => toggleLock(axis.id)}>{form.lockedAxes.includes(axis.id) ? '🔒 잠금' : '잠그기'}</button>
                </div>
                <div className="rp-axis-options">
                  {axis.options.map((option) => <button type="button" key={option} disabled={form.lockedAxes.includes(axis.id)} className={form.axes[axis.id] === option ? 'is-active' : ''} onClick={() => updateAxis(axis.id, option)}>{option}</button>)}
                </div>
              </section>
            ))}
          </div>
          <aside className="rp-opportunity-panel">
            <div><span><Icon name="spark" size={16} /></span><div><small>지금 조건으로 찾을 수 있는 방법</small><strong>{opportunityCount}가지</strong></div></div>
            <p>출발일을 ±2일로 열면 <b>{Math.min(5, opportunityCount + 2)}가지</b>로 늘어납니다.</p>
          </aside>
          <p className="rp-skip-note">잘 모르겠으면 넘어가셔도 됩니다. 제안을 보면서 다시 정할 수 있어요.</p>
        </>
      )}

      {step === 3 && (
        <>
          <SectionHeading eyebrow="STEP 3" title="이 조건으로 방법을 찾을게요" />
          <section className="rp-confirm-card">
            <span className="rp-confirm-card__route">{form.origin}<i>→</i>{form.destination}</span>
            <dl>
              <div><dt>화물</dt><dd>{form.containerSize} × {form.containerCount} · {form.teu}TEU</dd></div>
              <div><dt>희망 출발</dt><dd>8월 18일(화)</dd></div>
              <div><dt>도착 마감</dt><dd>8월 20일(목) 09:00</dd></div>
              <div><dt>현재 도로비</dt><dd>{formatManWon(form.roadCost)} <ConfidenceBadge kind="확인 완료" compact /></dd></div>
            </dl>
          </section>
          <section className="rp-open-axes">
            <strong>열어둔 검토 범위</strong>
            <div>{AXIS_OPTIONS.filter((axis) => !form.lockedAxes.includes(axis.id)).map((axis) => <span key={axis.id}>{axis.label} {form.axes[axis.id]}</span>)}</div>
          </section>
          <div className="rp-analysis-explainer">
            <span><Icon name="spark" size={20} /></span>
            <div><strong>AI가 그대로 견적을 내지 않습니다</strong><p>현재 계획을 기준선으로 계산한 뒤 날짜·화물역·물량 조합을 바꾸며 더 나은 상위 2~3개만 제안합니다.</p></div>
          </div>
        </>
      )}

      {error && <p className="rp-form-error" role="alert">{error}</p>}

      <div className="rp-form-actions">
        {step > 1 && <SecondaryButton onClick={() => setStep((current) => current - 1)}>이전</SecondaryButton>}
        {step < 3 && <PrimaryButton onClick={next} disabled={mode === 'email' && !extracted && step === 1}>다음</PrimaryButton>}
        {step === 3 && <PrimaryButton onClick={() => onAnalyze(form)} disabled={busy || form.hazardous === 'yes'}>{busy ? 'AI가 분석 중…' : 'AI에게 방법 물어보기'}</PrimaryButton>}
      </div>
    </div>
  )
}

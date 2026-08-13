import { useEffect, useMemo, useRef, useState } from 'react'
import { AXIS_OPTIONS, DEFAULT_FORM, EXAMPLE_EMAIL, FREIGHT_STATIONS, formatManWon } from '../demoData.js'
import { ConfidenceBadge, Icon, PrimaryButton, SecondaryButton, SectionHeading } from '../components.jsx'
import { SearchIcon } from '../../design-system/index.js'

function Field({ label, required = false, hint, children, evidence }) {
  return (
    <label className="rp-field">
      <span className="rp-field__label">{label}{required && <b>필수</b>}{hint && <small>{hint}</small>}</span>
      {children}
      {evidence && <em className="rp-evidence"><Icon name="check" size={11} /> {evidence}</em>}
    </label>
  )
}

function StepIndicator({ step }) {
  return (
    <div className="rp-stepper" aria-label={`3단계 중 ${step}단계`}>
      {[1, 2, 3].map((item) => <span key={item} className={item <= step ? 'is-active' : ''} aria-current={item === step ? 'step' : undefined}><i>{item < step ? '✓' : item}</i>{['기본 정보', '검토 범위', '확인'][item - 1]}</span>)}
    </div>
  )
}

function StationCombobox({ id, value, onChange, placeholder }) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef(null)

  useEffect(() => setQuery(value), [value])
  useEffect(() => {
    const close = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])

  const normalizedQuery = query.trim().replace(/역$/, '')
  const matches = FREIGHT_STATIONS.filter((station) => station.includes(normalizedQuery)).slice(0, 12)
  const selectStation = (station) => {
    setQuery(station)
    onChange(station)
    setOpen(false)
    setActiveIndex(-1)
  }

  return (
    <div className="rp-station-combobox" ref={containerRef}>
      <input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        aria-activedescendant={activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
        autoComplete="off"
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value)
          onChange('')
          setOpen(true)
          setActiveIndex(-1)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
          if (event.key === 'ArrowDown' && matches.length) {
            event.preventDefault()
            setOpen(true)
            setActiveIndex((current) => Math.min(current + 1, matches.length - 1))
          }
          if (event.key === 'ArrowUp' && matches.length) {
            event.preventDefault()
            setActiveIndex((current) => Math.max(current - 1, 0))
          }
          if (event.key === 'Enter' && open && (activeIndex >= 0 || matches.length === 1)) {
            event.preventDefault()
            selectStation(matches[activeIndex >= 0 ? activeIndex : 0])
          }
        }}
      />
      <SearchIcon size={16} />
      {open && (
        <div className="rp-station-options" id={`${id}-options`} role="listbox">
          {matches.length ? matches.map((station, index) => (
            <button type="button" id={`${id}-option-${index}`} role="option" aria-selected={value === station} className={activeIndex === index ? 'is-highlighted' : ''} key={station} onMouseEnter={() => setActiveIndex(index)} onClick={() => selectStation(station)}>
              <strong>{station}역</strong><small>철도 화물 취급역</small>
            </button>
          )) : <p>일치하는 화물역이 없습니다.</p>}
        </div>
      )}
      <small className="rp-station-source">공공데이터포털 · 한국철도공사 화물역 데이터</small>
    </div>
  )
}

export function RequestScreen({ onAnalyze, onExtract, busy, initialVoiceText = '', onInitialVoiceTextConsumed }) {
  const [step, setStep] = useState(1)
  const [mode, setMode] = useState('voice')
  const [emailText, setEmailText] = useState(initialVoiceText)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [evidence, setEvidence] = useState({})
  const [extracted, setExtracted] = useState(false)
  const [error, setError] = useState('')
  const [listening, setListening] = useState(false)
  const [speechSupported] = useState(() => Boolean(window.SpeechRecognition || window.webkitSpeechRecognition))
  const recognitionRef = useRef(null)

  useEffect(() => {
    if (!initialVoiceText) return
    setMode('voice')
    setEmailText(initialVoiceText)
    onInitialVoiceTextConsumed?.()
  }, [initialVoiceText, onInitialVoiceTextConsumed])

  useEffect(() => () => recognitionRef.current?.stop(), [])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      document.querySelector('.rp-screen-body')?.scrollTo({ top: 0, behavior: 'auto' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [step, mode])

  const update = (name, value) => setForm((current) => ({ ...current, [name]: value }))
  const updateAxis = (id, value) => setForm((current) => ({ ...current, axes: { ...current.axes, [id]: value } }))
  const opportunityCount = useMemo(() => {
    const open = AXIS_OPTIONS.filter((axis) => !['불가', '지정한 곳만', '기존 유지'].includes(form.axes[axis.id])).length
    return Math.min(5, Math.max(1, open - 1))
  }, [form.axes])

  const handleExtract = async () => {
    if (!emailText.trim()) {
      setError('메일이나 발주서 내용을 붙여넣어 주세요.')
      return
    }
    setError('')
    try {
      const result = await onExtract(emailText)
      setForm((current) => ({
        ...current,
        ...result.fields,
        axes: { ...current.axes, ...(result.fields.axes ?? {}) },
        intake: { channel: mode === 'voice' ? 'voice-transcript' : 'document', transcript: emailText.trim(), audioStored: false },
      }))
      setEvidence(result.evidence ?? {})
      setExtracted(true)
    } catch (extractError) {
      setError(extractError.message)
    }
  }

  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 또는 Edge에서 이용해 주세요.')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'ko-KR'
    recognition.continuous = true
    recognition.interimResults = true
    let confirmedText = emailText.trim()
    recognition.onresult = (event) => {
      let interimText = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const phrase = event.results[index][0].transcript.trim()
        if (event.results[index].isFinal) confirmedText = `${confirmedText} ${phrase}`.trim()
        else interimText += `${phrase} `
      }
      setEmailText(`${confirmedText} ${interimText}`.trim())
    }
    recognition.onerror = (event) => {
      setListening(false)
      if (event.error !== 'aborted') setError('음성을 또렷이 인식하지 못했습니다. 다시 말하거나 현재 텍스트를 직접 고쳐 주세요.')
    }
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    setError('')
    setListening(true)
    recognition.start()
  }

  const stopVoiceInput = () => {
    recognitionRef.current?.stop()
    setListening(false)
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
          <div className="rp-segmented" aria-label="운송 조건 입력 방법">
            <button type="button" aria-pressed={mode === 'voice'} className={mode === 'voice' ? 'is-active' : ''} onClick={() => setMode('voice')}>전화·음성</button>
            <button type="button" aria-pressed={mode === 'direct'} className={mode === 'direct' ? 'is-active' : ''} onClick={() => setMode('direct')}>조건 선택</button>
            <button type="button" aria-pressed={mode === 'email'} className={mode === 'email' ? 'is-active' : ''} onClick={() => setMode('email')}>이메일·문서</button>
          </div>

          {(mode === 'email' || mode === 'voice') && (
            <section className="rp-paste-card">
              <div className="rp-paste-card__heading"><span><Icon name={mode === 'voice' ? 'mic' : 'mail'} size={17} /></span><div><strong>{mode === 'voice' ? '음성으로 운송 조건 입력' : '사내 메일을 그대로 붙여넣으세요'}</strong><small>{mode === 'voice' ? '마이크 버튼을 누르면 인식한 조건이 바로 표시됩니다.' : '원문에 없는 값은 만들지 않고 확인 필요로 남깁니다.'}</small></div></div>
              {mode === 'voice' && (
                <>
                  <div className="rp-voice-controls">
                    <button type="button" className={listening ? 'is-listening' : ''} onClick={listening ? stopVoiceInput : startVoiceInput} aria-pressed={listening} disabled={!speechSupported}>
                      <Icon name={listening ? 'stop' : 'mic'} size={18} /> {listening ? '음성 입력 종료' : '음성 입력 시작'}
                    </button>
                    <small>{speechSupported ? (listening ? '말씀하신 내용이 아래에 실시간으로 표시됩니다.' : '마이크 사용 권한이 필요합니다.') : '이 브라우저에서는 직접 텍스트를 입력해 주세요.'}</small>
                  </div>
                  <aside className="rp-voice-privacy"><strong>음성 파일은 저장하지 않습니다</strong><p>받아쓴 내용과 사용자가 수정한 운송 조건만 요청 기록에 남습니다.</p></aside>
                </>
              )}
              <textarea aria-label={mode === 'voice' ? '음성 인식 텍스트' : '메일 또는 문서 내용'} value={emailText} onChange={(event) => setEmailText(event.target.value)} placeholder={mode === 'voice' ? '예: 아산에서 부산신항까지 20피트 4개, 8월 18일 출발이요…' : '출발지, 도착지, 수량, 날짜가 포함된 메일 내용을 붙여넣어 주세요.'} />
              {mode === 'email' && <button type="button" className="rp-sample-button" onClick={() => setEmailText(EXAMPLE_EMAIL)}>예시 메일 불러오기</button>}
              <PrimaryButton disabled={busy || listening || !emailText.trim()} onClick={handleExtract}>{busy ? '조건을 읽는 중…' : mode === 'voice' ? '받아쓴 내용으로 조건 입력' : '조건 자동 입력'}</PrimaryButton>
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
                <StationCombobox id="origin-station" value={form.origin} onChange={(value) => update('origin', value)} placeholder="출발 화물역 검색" />
              </Field>
              <Field label="도착지" required evidence={evidence.destination}>
                <StationCombobox id="destination-station" value={form.destination} onChange={(value) => update('destination', value)} placeholder="도착 화물역 검색" />
              </Field>
              <div className="rp-field-row">
                <Field label="컨테이너" required evidence={evidence.containerCount}>
                  <select value={form.containerSize} onChange={(event) => {
                    const containerSize = event.target.value
                    setForm((current) => ({ ...current, containerSize, teu: current.containerCount * (containerSize === '40ft' ? 2 : 1) }))
                  }}><option>20ft</option><option>40ft</option></select>
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
                  {[['no', '아니오'], ['yes', '예']].map(([value, label]) => <button type="button" key={value} aria-pressed={form.hazardous === value} className={form.hazardous === value ? 'is-active' : ''} onClick={() => update('hazardous', value)}>{label}</button>)}
                </div>
              </Field>
              {form.hazardous === 'yes' && <div className="rp-danger-note"><Icon name="alert" size={18} /><div><strong>위험물은 별도 검토가 필요합니다</strong><p>자동 계산을 중단하고 코레일 담당자가 취급 가능 여부를 확인합니다.</p></div></div>}
              <details className="rp-optional-fields" open>
                <summary>정확도를 높이는 참고 정보</summary>
                <Field label="원래 계획한 운송 방식"><select value={form.currentMode} onChange={(event) => update('currentMode', event.target.value)}><option value="road">도로운송</option><option value="rail">철도운송</option><option value="undecided">아직 미정</option></select></Field>
                <Field label="현재 받은 운송비" hint="견적이 없다면 비워두셔도 됩니다"><div className="rp-number-input"><input type="number" step="10000" value={form.roadCost || ''} placeholder="선택 입력" onChange={(event) => update('roadCost', event.target.value ? Number(event.target.value) : null)} /><span>원</span></div></Field>
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
          <p className="rp-section-copy">조정할 수 있는 범위를 알려주시면 가능한 운송 방법을 더 찾아봅니다.</p>
          <div className="rp-axis-list">
            {AXIS_OPTIONS.map((axis) => (
              <section className="rp-axis-card" key={axis.id}>
                <div className="rp-axis-card__head">
                  <div><strong>{axis.label}</strong><small>{axis.helper}</small></div>
                </div>
                <div className="rp-axis-options">
                  {axis.options.map((option) => <button type="button" key={option} aria-pressed={form.axes[axis.id] === option} className={form.axes[axis.id] === option ? 'is-active' : ''} onClick={() => updateAxis(axis.id, option)}>{option}</button>)}
                </div>
              </section>
            ))}
          </div>
          <aside className="rp-opportunity-panel">
            <div><span><Icon name="train" size={16} /></span><div><small>지금 조건으로 찾을 수 있는 방법</small><strong>{opportunityCount}가지</strong></div></div>
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
              <div><dt>희망 출발</dt><dd>{form.departureDate}</dd></div>
              <div><dt>도착 마감</dt><dd>{form.deadline.replace('T', ' ')}</dd></div>
              <div><dt>원래 계획</dt><dd>{{ road: '도로운송', rail: '철도운송', undecided: '운송 방식 미정' }[form.currentMode]}</dd></div>
              <div><dt>받은 운송비</dt><dd>{form.roadCost ? <>{formatManWon(form.roadCost)} <ConfidenceBadge kind="확인 완료" compact /></> : '입력 안 함 · 시장 기준으로 비교'}</dd></div>
            </dl>
          </section>
          <section className="rp-open-axes">
            <strong>열어둔 검토 범위</strong>
            <div>{AXIS_OPTIONS.map((axis) => <span key={axis.id}>{axis.label} {form.axes[axis.id]}</span>)}</div>
          </section>
          <div className="rp-analysis-explainer">
            <span><Icon name="check" size={20} /></span>
            <div><strong>입력한 조건 안에서 비교합니다</strong><p>현재 계획과 날짜·화물역·물량 조합을 비교해 차이가 큰 운송 방법만 보여드립니다.</p></div>
          </div>
        </>
      )}

      {error && <p className="rp-form-error" role="alert">{error}</p>}

      {!(step === 1 && ['email', 'voice'].includes(mode) && !extracted) && (
        <div className="rp-form-actions">
          {step > 1 && <SecondaryButton onClick={() => setStep((current) => current - 1)}>이전</SecondaryButton>}
          {step < 3 && <PrimaryButton onClick={next}>다음</PrimaryButton>}
          {step === 3 && <PrimaryButton onClick={() => onAnalyze(form)} disabled={busy || form.hazardous === 'yes'}>{busy ? '운송 방법 찾는 중…' : '운송 방법 찾기'}</PrimaryButton>}
        </div>
      )}
    </div>
  )
}

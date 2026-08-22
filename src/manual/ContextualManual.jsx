import { useEffect, useRef, useState } from 'react'
import { AppIcon } from '../design-system/index.js'
import { getManualEntry } from './manualContent.js'

const COMPACT_MEDIA_QUERY = '(max-width: 920px)'

function ManualBookIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.5 4.8c0-.7.6-1.3 1.3-1.3h4.1c1.1 0 2.1.5 2.7 1.3v15.5c-.6-.8-1.6-1.3-2.7-1.3H5.8c-.7 0-1.3-.6-1.3-1.3V4.8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M19.5 4.8c0-.7-.6-1.3-1.3-1.3h-4.1c-1.1 0-2.1.5-2.7 1.3v15.5c.6-.8 1.6-1.3 2.7-1.3h4.1c.7 0 1.3-.6 1.3-1.3V4.8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M7.4 7.2h2.1M7.4 10h2.1M14.5 7.2h2.1M14.5 10h2.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function CloseIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function ManualSectionHeading({ id, number, children }) {
  return <h3 id={id}><span>{number}</span>{children}</h3>
}

function ManualBody({ entry }) {
  return (
    <>
      <section className="gx-manual-section gx-manual-focus" aria-labelledby="gx-manual-focus-title">
        <ManualSectionHeading id="gx-manual-focus-title" number="01">이 화면에서 할 일</ManualSectionHeading>
        <ul>
          {entry.focus.map((item) => <li key={item}><AppIcon name="check" size={15} /><span>{item}</span></li>)}
        </ul>
      </section>

      <section className="gx-manual-section gx-manual-steps" aria-labelledby="gx-manual-steps-title">
        <ManualSectionHeading id="gx-manual-steps-title" number="02">사용 순서</ManualSectionHeading>
        <ol>
          {entry.steps.map((step, index) => (
            <li key={step.title}>
              <i>{index + 1}</i>
              <div><strong>{step.title}</strong><p>{step.body}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="gx-manual-section gx-manual-controls" aria-labelledby="gx-manual-controls-title">
        <ManualSectionHeading id="gx-manual-controls-title" number="03">버튼과 표시 읽기</ManualSectionHeading>
        <dl>
          {entry.controls.map((control) => (
            <div key={control.label}><dt>{control.label}</dt><dd>{control.description}</dd></div>
          ))}
        </dl>
      </section>

      <section className="gx-manual-section gx-manual-states" aria-labelledby="gx-manual-states-title">
        <ManualSectionHeading id="gx-manual-states-title" number="04">상태별 의미</ManualSectionHeading>
        <ul>
          {entry.states.map((state) => (
            <li key={state.label}><span className={`is-${state.tone}`}>{state.label}</span><p>{state.description}</p></li>
          ))}
        </ul>
      </section>

      <section className="gx-manual-section gx-manual-callouts" aria-label="주의사항과 사용 팁">
        <div className="gx-manual-warning">
          <span><AppIcon name="alert" size={18} /></span>
          <div><strong>{entry.warning.title}</strong><p>{entry.warning.body}</p></div>
        </div>
        <div className="gx-manual-tip">
          <span><AppIcon name="spark" size={18} /></span>
          <div><strong>더 잘 쓰는 팁</strong><p>{entry.tip}</p></div>
        </div>
      </section>

      <section className="gx-manual-section gx-manual-terms" aria-labelledby="gx-manual-terms-title">
        <ManualSectionHeading id="gx-manual-terms-title" number="05">화면 용어</ManualSectionHeading>
        <dl>
          {entry.terms.map((item) => (
            <div key={item.term}><dt>{item.term}</dt><dd>{item.definition}</dd></div>
          ))}
        </dl>
      </section>

      <section className="gx-manual-next" aria-label="다음 추천 행동">
        <small>다음 추천 행동</small>
        <strong>{entry.next.title}</strong>
        <p>{entry.next.body}</p>
      </section>
    </>
  )
}

export function ContextualManual({ screen, railView }) {
  const entry = getManualEntry(screen, railView)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [compact, setCompact] = useState(() => window.matchMedia(COMPACT_MEDIA_QUERY).matches)
  const triggerRef = useRef(null)
  const closeRef = useRef(null)
  const scrollRef = useRef(null)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    const media = window.matchMedia(COMPACT_MEDIA_QUERY)
    const update = (event) => setCompact(event.matches)
    setCompact(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }, [entry.id])

  useEffect(() => {
    const open = compact && mobileOpen
    if (!open) {
      if (wasOpenRef.current) triggerRef.current?.focus()
      wasOpenRef.current = false
      return undefined
    }

    wasOpenRef.current = true
    const appSurface = document.querySelector('.kr-phone-stage')
    if (appSurface) appSurface.inert = true
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus())
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      if (appSurface) appSurface.inert = false
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [compact, mobileOpen])

  const panelOpen = !compact || mobileOpen

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="gx-manual-launch"
        aria-label={`현재 화면 사용 매뉴얼 열기: ${entry.title}`}
        aria-expanded={mobileOpen}
        aria-controls="gx-contextual-manual"
        onClick={() => setMobileOpen(true)}
      >
        <span><ManualBookIcon size={19} /></span>
        <strong>화면 매뉴얼</strong>
      </button>

      {compact && mobileOpen && <div className="gx-manual-backdrop" aria-hidden="true" onMouseDown={() => setMobileOpen(false)} />}

      <aside
        id="gx-contextual-manual"
        className={`gx-manual-panel ${panelOpen ? 'is-open' : ''}`}
        role={compact ? 'dialog' : 'complementary'}
        aria-modal={compact ? 'true' : undefined}
        aria-labelledby="gx-contextual-manual-title"
        data-manual-context={entry.id}
        onKeyDown={(event) => {
          if (compact && mobileOpen && event.key === 'Tab') {
            event.preventDefault()
            closeRef.current?.focus()
          }
        }}
      >
        <header className="gx-manual-header">
          <div className="gx-manual-meta">
            <span><i />현재 화면 자동 연동</span>
            <b>{entry.position} / {entry.total}</b>
          </div>
          <div className="gx-manual-title" aria-live="polite" aria-atomic="true">
            <span className="gx-manual-title__icon"><ManualBookIcon /></span>
            <div><small>{entry.group}</small><h2 id="gx-contextual-manual-title">{entry.title}</h2></div>
          </div>
          <p>{entry.summary}</p>
          <button ref={closeRef} type="button" className="gx-manual-close" aria-label="사용 매뉴얼 닫기" onClick={() => setMobileOpen(false)}><CloseIcon /></button>
        </header>

        <div ref={scrollRef} className="gx-manual-scroll">
          <ManualBody entry={entry} />
          <footer>앱에서 화면을 이동하면 이 매뉴얼도 자동으로 바뀝니다.</footer>
        </div>
      </aside>
    </>
  )
}

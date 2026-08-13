import { useEffect, useState } from 'react'

const formatTime = () => new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}).format(new Date())

export function StatusBar() {
  const [time, setTime] = useState(formatTime)

  useEffect(() => {
    const timer = window.setInterval(() => setTime(formatTime()), 15_000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="kr-statusbar" aria-label="상태 막대">
      <span className="kr-statusbar__time">{time}</span>
      <span className="kr-statusbar__island" aria-hidden="true" />
      <span className="kr-statusbar__right" aria-hidden="true">
        <span className="kr-signal"><i /><i /><i /><i /></span>
        <span className="kr-lte">LTE</span>
        <span className="kr-battery"><span /></span>
      </span>
    </div>
  )
}

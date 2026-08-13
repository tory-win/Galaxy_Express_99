export function formatDepartureDate(rawDepartureDate) {
  if (!rawDepartureDate) return ''
  const parsed = rawDepartureDate instanceof Date
    ? rawDepartureDate
    : new Date(`${rawDepartureDate}T00:00:00+09:00`)
  if (Number.isNaN(parsed.getTime())) return String(rawDepartureDate)

  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('ko-KR', {
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
      timeZone: 'Asia/Seoul',
    }).formatToParts(parsed).map(({ type, value }) => [type, value]),
  )
  return `${parts.month}월 ${parts.day}일(${parts.weekday})`
}

export function formatTeu(rawTeu) {
  const teu = Number(rawTeu)
  return Number.isFinite(teu) && Number.isInteger(teu) ? String(teu) : String(rawTeu)
}

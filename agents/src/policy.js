export function desiredMembership(role, nowMs) {
  if (role === 'base') return true
  const phase = Math.floor(nowMs / 30_000) % 3
  if (role === 'flex-a') return phase === 1
  if (role === 'flex-b') return phase === 2
  return false
}

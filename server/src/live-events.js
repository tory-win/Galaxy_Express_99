const clients = new Set()

export function openEventStream(request, response, initialPayload) {
  response.status(200)
  response.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  response.setHeader('Cache-Control', 'no-cache, no-transform')
  response.setHeader('Connection', 'keep-alive')
  response.setHeader('X-Accel-Buffering', 'no')
  response.flushHeaders?.()

  response.write(`retry: 3000\ndata: ${JSON.stringify({ type: 'connected', ...initialPayload })}\n\n`)
  clients.add(response)
  request.on('close', () => clients.delete(response))
}

export function publishLiveEvent(event) {
  const frame = `data: ${JSON.stringify(event)}\n\n`
  for (const client of clients) client.write(frame)
}

export function closeEventStreams() {
  for (const client of clients) client.end()
  clients.clear()
}

const keepAlive = setInterval(() => {
  for (const client of clients) client.write(': keep-alive\n\n')
}, 15_000)
keepAlive.unref()

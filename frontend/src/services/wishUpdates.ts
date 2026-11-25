const POLL_INTERVAL = 8_000
const INITIAL_RECONNECT_DELAY = 1_000
const MAX_RECONNECT_DELAY = 15_000

export function subscribeToWishUpdates(refresh: () => void) {
  const url = new URL('/api/wishes/ws', window.location.href)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'

  let socket: WebSocket | undefined
  let reconnectTimer: number | undefined
  let reconnectDelay = INITIAL_RECONNECT_DELAY
  let stopped = false

  function scheduleReconnect() {
    if (stopped) return
    reconnectTimer = window.setTimeout(connect, reconnectDelay)
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY)
  }

  function connect() {
    if (stopped) return
    try {
      socket = new WebSocket(url)
    } catch {
      scheduleReconnect()
      return
    }

    socket.addEventListener('open', () => {
      if (stopped) return
      reconnectDelay = INITIAL_RECONNECT_DELAY
      refresh()
    })
    socket.addEventListener('message', (event) => {
      if (!stopped && event.data === 'wish-created') refresh()
    })
    socket.addEventListener('close', scheduleReconnect, { once: true })
  }

  connect()
  const pollTimer = window.setInterval(() => {
    if (socket?.readyState !== WebSocket.OPEN) refresh()
  }, POLL_INTERVAL)

  return () => {
    stopped = true
    window.clearInterval(pollTimer)
    window.clearTimeout(reconnectTimer)
    socket?.close()
  }
}

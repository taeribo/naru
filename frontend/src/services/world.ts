import { useEffect, useRef, useState } from 'react'

const SESSION_KEY = 'naru.worldSession'
const RETRY_MIN = 1_000
const RETRY_MAX = 15_000

export interface WorldPlayer {
  id: string
  x: number
  z: number
}

interface WorldState {
  status: 'connecting' | 'waiting' | 'joined' | 'offline'
  id: string | null
  room: number | null
  queuePosition: number | null
  roomToken: string | null
  players: WorldPlayer[]
}

type WorldEvent =
  | { type: 'waiting'; token: string; position: number }
  | { type: 'joined'; token: string; id: string; room: number }
  | { type: 'snapshot'; players: WorldPlayer[] }

const INITIAL: WorldState = {
  status: 'connecting',
  id: null,
  room: null,
  queuePosition: null,
  roomToken: null,
  players: [],
}

function readSession() {
  try {
    return sessionStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

function saveSession(token: string) {
  try {
    sessionStorage.setItem(SESSION_KEY, token)
  } catch {
    // The current tab retains its token in memory.
  }
}

export function useWorld() {
  const [state, setState] = useState<WorldState>(INITIAL)
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let token = readSession()
    let reconnect: number | undefined
    let delay = RETRY_MIN
    let stopped = false
    let startAtEntrance = true
    const url = new URL('/api/world/ws', window.location.href)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'

    function retry() {
      if (stopped) return
      setState({ ...INITIAL, status: 'offline' })
      reconnect = window.setTimeout(connect, delay)
      delay = Math.min(delay * 2, RETRY_MAX)
    }

    function connect() {
      try {
        const socket = new WebSocket(url)
        socketRef.current = socket
        socket.addEventListener('open', () => {
          if (!stopped)
            socket.send(
              JSON.stringify({ type: 'join', token, startAtEntrance }),
            )
        })
        socket.addEventListener('message', ({ data }) => {
          if (stopped || typeof data !== 'string') return
          let event: WorldEvent
          try {
            event = JSON.parse(data) as WorldEvent
          } catch {
            return
          }

          switch (event.type) {
            case 'waiting':
              token = event.token
              saveSession(event.token)
              delay = RETRY_MIN
              setState({
                ...INITIAL,
                status: 'waiting',
                queuePosition: event.position,
              })
              break
            case 'joined':
              startAtEntrance = false
              token = event.token
              saveSession(event.token)
              delay = RETRY_MIN
              setState({
                ...INITIAL,
                status: 'joined',
                id: event.id,
                room: event.room,
                roomToken: event.token,
              })
              break
            case 'snapshot':
              setState((current) => ({ ...current, players: event.players }))
              break
          }
        })
        socket.addEventListener(
          'close',
          (event) => {
            if (event.code === 1008) {
              if (!stopped) setState({ ...INITIAL, status: 'offline' })
              return
            }
            retry()
          },
          { once: true },
        )
      } catch {
        retry()
      }
    }

    connect()
    return () => {
      stopped = true
      window.clearTimeout(reconnect)
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [])

  function move(x: number, z: number) {
    const socket = socketRef.current
    if (state.status === 'joined' && socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'move', x, z }))
    }
  }

  return { ...state, move }
}

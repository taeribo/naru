import { useEffect, useRef, useState } from 'react'
import { BellPanel } from '../features/BellPanel'
import { FortunePanel } from '../features/FortunePanel'
import { useWorld } from '../services/world'
import { DonationDialog } from '../features/DonationDialog'
import { PlazaMap } from '../features/PlazaMap'
import { SoundToggle } from '../features/SoundToggle'
import { WishPanel } from '../features/WishPanel'
import { PlazaMovement } from '../scenes/PlazaMovement'
import type { PlazaVector } from '../scenes/PlazaMovement'
import { PlazaScene } from '../scenes/PlazaScene'
import {
  canWalkStraight,
  loadWalkableMap,
  planRoute,
} from '../scenes/navigation'
import { WORLD_BOUNDS, ZONES } from '../scenes/terrain'
import { ZONE_LABELS } from '../scenes/Zones'
import type { ZoneId } from '../scenes/Zones'
import './app.css'

export function App() {
  const [panel, setPanel] = useState<ZoneId | null>(null)
  const [closingFortune, setClosingFortune] = useState(false)
  const closeTimer = useRef<number | undefined>(undefined)
  const world = useWorld()
  const [wishNotice, setWishNotice] = useState(0)
  const [wishHangs, setWishHangs] = useState(0)
  const [bellRings, setBellRings] = useState(0)
  const dialog = useRef<HTMLDialogElement>(null)
  const cameraBearing = useRef(0)
  const ownPlayer = world.players.find((player) => player.id === world.id)
  // 길을 따라 걷는 중일 때 남은 경유지. 서버는 경유지 사이를 곧장 걷는다.
  const route = useRef<{ x: number; z: number }[]>([])
  const heading = useRef<{ x: number; z: number } | null>(null)

  function sendMove(x: number, z: number) {
    heading.current = { x, z }
    world.move(x, z)
  }

  useEffect(loadWalkableMap, [])

  /** 건물·노점·나무를 피해 길로만 걸어간다. exact면 의자·우물 앞 같은 정해진 자리까지 들어간다. */
  function walkTo(x: number, z: number, exact = false) {
    if (!ownPlayer) {
      sendMove(x, z)
      return
    }
    const points = planRoute(ownPlayer, { x, z }, exact)
    const first = points.shift()
    route.current = points
    if (first) sendMove(first.x, first.z)
  }

  // 경유지에 닿으면 다음 경유지로 간다.
  useEffect(() => {
    const next = route.current[0]
    const current = heading.current
    if (!ownPlayer || !current || !next) return
    if (Math.hypot(ownPlayer.x - current.x, ownPlayer.z - current.z) > 0.3)
      return
    route.current = route.current.slice(1)
    sendMove(next.x, next.z)
  })

  useEffect(() => {
    if (panel && !dialog.current?.open) dialog.current?.showModal()
    if (!panel && dialog.current?.open) dialog.current.close()
  }, [panel])

  useEffect(() => {
    if (!wishNotice) return
    const timer = window.setTimeout(() => setWishNotice(0), 2_700)
    return () => window.clearTimeout(timer)
  }, [wishNotice])

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  function openPanel(zone: ZoneId) {
    if (zone === 'wish') {
      route.current = []
      heading.current = null
      if (ownPlayer) world.move(ownPlayer.x, ownPlayer.z)
    }
    setPanel(zone)
  }

  function closePanel() {
    if (
      panel !== 'fortune' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setPanel(null)
      return
    }
    if (closeTimer.current !== undefined) return
    setClosingFortune(true)
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = undefined
      setPanel(null)
      setClosingFortune(false)
    }, 200)
  }

  function hangWish() {
    setWishNotice((count) => count + 1)
    setWishHangs((count) => count + 1)
    setPanel((current) => (current === 'wish' ? null : current))
  }

  function moveToZone(zone: ZoneId) {
    if (world.status !== 'joined' || !ownPlayer || panel) return
    const [x, z] = ZONES[zone]
    walkTo(x, z + (zone === 'rest' ? 2.5 : 4.5))
  }

  function visitRestArea() {
    walkTo(ZONES.rest[0], ZONES.rest[1] + 2.5)
    setPanel(null)
  }

  function moveInDirection(vector: PlazaVector) {
    if (world.status !== 'joined' || !ownPlayer || panel) return
    // 화면 아래쪽(y+)이 카메라 쪽, 위쪽이 카메라가 바라보는 쪽이다.
    const angle = cameraBearing.current + Math.atan2(vector.x, vector.y)
    const reach = 0.7 + 0.9 * Math.min(1, Math.hypot(vector.x, vector.y))
    const clampX = (x: number) =>
      Math.max(WORLD_BOUNDS.minX, Math.min(WORLD_BOUNDS.maxX, x))
    const clampZ = (z: number) =>
      Math.max(WORLD_BOUNDS.minZ, Math.min(WORLD_BOUNDS.maxZ, z))
    const dx = Math.sin(angle) * reach
    const dz = Math.cos(angle) * reach
    // 막힌 곳으로는 들어가지 않고, 벽에 비스듬히 부딪히면 벽을 따라 미끄러진다.
    const tries = [
      { x: dx, z: dz },
      { x: dx * 0.5, z: dz * 0.5 },
      { x: dx, z: 0 },
      { x: 0, z: dz },
    ]
    route.current = []
    for (const step of tries) {
      if (Math.hypot(step.x, step.z) < 0.2) continue
      const target = {
        x: clampX(ownPlayer.x + step.x),
        z: clampZ(ownPlayer.z + step.z),
      }
      if (canWalkStraight(ownPlayer, target)) {
        sendMove(target.x, target.z)
        return
      }
    }
  }

  const routedWorld = {
    ...world,
    move: (x: number, z: number) => walkTo(x, z),
    arrive: (x: number, z: number) => walkTo(x, z, true),
  }

  return (
    <main className="plaza">
      <PlazaScene
        world={routedWorld}
        wishSignal={wishHangs}
        bellSignal={bellRings}
        onOpenZone={openPanel}
        onCameraBearing={(bearing) => {
          cameraBearing.current = bearing
        }}
      />
      <header className="plaza-header">
        <h1>새 해</h1>
        <nav aria-label="새 해 체험">
          {Object.entries(ZONE_LABELS).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="plaza-button plaza-button--menu"
              onClick={() => moveToZone(id as ZoneId)}
            >
              {label}
              <span aria-hidden="true" className="plaza-chevron">
                ›
              </span>
            </button>
          ))}
        </nav>
        <div className="corner-tools">
          <PlazaMap
            players={world.players}
            ownId={world.id}
            canMove={world.status === 'joined' && !!ownPlayer}
            onMove={(x, z) => walkTo(x, z)}
          />
          <SoundToggle />
        </div>
        <DonationDialog />
      </header>
      <PlazaMovement
        disabled={world.status !== 'joined' || !ownPlayer || panel !== null}
        onMove={moveInDirection}
      />
      <p className="world-help">
        {world.status === 'joined' && (
          <span>{world.room}번 공간 · 바닥을 눌러 이동 · </span>
        )}
        {world.status === 'waiting' && (
          <span role="status">입장 대기 {world.queuePosition}번째 · </span>
        )}
        {world.status === 'offline' && (
          <span role="status">공간 연결 끊김 · </span>
        )}
        드래그로 시점 이동 · 휠 또는 두 손가락으로 확대·축소
      </p>
      <p className="world-status" role="status">
        {wishNotice > 0 ? '소원패를 걸었어요.' : ''}
      </p>
      <dialog
        ref={dialog}
        className={
          panel === 'fortune' ? 'plaza-panel fortune-dialog' : 'plaza-panel'
        }
        data-closing={closingFortune}
        aria-labelledby="panel-title"
        onCancel={(event) => {
          event.preventDefault()
          closePanel()
        }}
      >
        <div className="panel-heading">
          <h2 id="panel-title">{panel ? ZONE_LABELS[panel] : ''}</h2>
          <button className="plaza-button" onClick={closePanel}>
            닫기
          </button>
        </div>
        {panel === 'fortune' && <FortunePanel />}
        {panel === 'bell' && (
          <BellPanel
            disabled={world.status !== 'joined' || !ownPlayer}
            onRing={() => {
              setBellRings((count) => count + 1)
              setPanel(null)
            }}
          />
        )}
        {panel === 'rest' && (
          <div className="zone-panel">
            <button
              type="button"
              className="plaza-button"
              onClick={visitRestArea}
              disabled={world.status !== 'joined'}
            >
              온천으로 이동
            </button>
          </div>
        )}
        <div hidden={panel !== 'wish'}>
          <WishPanel
            open={panel === 'wish'}
            onHang={hangWish}
            roomToken={world.roomToken}
          />
        </div>
      </dialog>
    </main>
  )
}

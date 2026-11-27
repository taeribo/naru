import { useEffect, useRef, useState } from 'react'
import { BellPanel } from '../features/BellPanel'
import { FortunePanel } from '../features/FortunePanel'
import { useWorld } from '../services/world'
import { DonationDialog } from '../features/DonationDialog'
import { WishPanel } from '../features/WishPanel'
import { PlazaMovement } from '../scenes/PlazaMovement'
import type { PlazaDirection } from '../scenes/PlazaMovement'
import { PlazaScene } from '../scenes/PlazaScene'
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
  const dialog = useRef<HTMLDialogElement>(null)
  const cameraBearing = useRef(0)
  const ownPlayer = world.players.find((player) => player.id === world.id)

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
    setPanel((current) => (current === 'wish' ? null : current))
  }

  function visitRestArea() {
    world.move(ZONES.rest[0], ZONES.rest[1] + 2.5)
    setPanel(null)
  }

  function moveInDirection(direction: PlazaDirection) {
    if (world.status !== 'joined' || !ownPlayer || panel) return
    const angle =
      cameraBearing.current +
      { up: Math.PI, left: -Math.PI / 2, down: 0, right: Math.PI / 2 }[
        direction
      ]
    const x = Math.max(
      WORLD_BOUNDS.minX,
      Math.min(WORLD_BOUNDS.maxX, ownPlayer.x + Math.sin(angle) * 1.4),
    )
    const z = Math.max(
      WORLD_BOUNDS.minZ,
      Math.min(WORLD_BOUNDS.maxZ, ownPlayer.z + Math.cos(angle) * 1.4),
    )
    world.move(x, z)
  }

  return (
    <main className="plaza">
      <PlazaScene
        world={world}
        onOpenZone={setPanel}
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
              onClick={() => setPanel(id as ZoneId)}
            >
              {label}
              <span aria-hidden="true" className="plaza-chevron">
                ›
              </span>
            </button>
          ))}
        </nav>
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
        {panel === 'bell' && <BellPanel />}
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

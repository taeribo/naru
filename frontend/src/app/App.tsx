import { useEffect, useRef, useState } from 'react'
import { FortunePanel } from '../features/FortunePanel'
import { useWorld } from '../services/world'
import { DonationDialog } from '../features/DonationDialog'
import { WishPanel } from '../features/WishPanel'
import { PlazaMovement } from '../scenes/PlazaMovement'
import type { PlazaDirection } from '../scenes/PlazaMovement'
import { PlazaScene } from '../scenes/PlazaScene'
import { WORLD_BOUNDS } from '../scenes/terrain'
import type { ZoneId } from '../scenes/Zones'
import './app.css'

export function App() {
  const [panel, setPanel] = useState<ZoneId | null>(null)
  const [closingFortune, setClosingFortune] = useState(false)
  const closeTimer = useRef<number | undefined>(undefined)
  const world = useWorld()
  const [launchId, setLaunchId] = useState<number | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const launchCount = useRef(0)
  const cameraBearing = useRef(0)
  const ownPlayer = world.players.find((player) => player.id === world.id)

  useEffect(() => {
    if (panel && !dialog.current?.open) dialog.current?.showModal()
    if (!panel && dialog.current?.open) dialog.current.close()
  }, [panel])

  useEffect(() => {
    if (launchId === null) return
    const timer = window.setTimeout(() => setLaunchId(null), 2_200)
    return () => window.clearTimeout(timer)
  }, [launchId])

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

  function launch() {
    launchCount.current += 1
    setLaunchId(launchCount.current)
    setPanel((current) => (current === 'wish' ? null : current))
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
        launchId={launchId}
        onComplete={() => setLaunchId(null)}
        world={world}
        onOpenZone={(zone) => {
          if (zone === 'wish' && launchId !== null) return
          setPanel(zone)
        }}
        onCameraBearing={(bearing) => {
          cameraBearing.current = bearing
        }}
      />
      <header className="plaza-header">
        <h1>나루</h1>
        <nav aria-label="나루 체험">
          <button
            className="plaza-button plaza-button--menu"
            onClick={() => setPanel('fortune')}
          >
            <span aria-hidden="true">☾</span> 운세보기
            <span aria-hidden="true" className="plaza-chevron">
              ›
            </span>
          </button>
          <button
            className="plaza-button plaza-button--menu"
            disabled={launchId !== null}
            onClick={() => {
              setPanel('wish')
            }}
          >
            <span aria-hidden="true">◇</span> 풍등날리기
            <span aria-hidden="true" className="plaza-chevron">
              ›
            </span>
          </button>
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
        {launchId === null ? '' : '소원을 담은 풍등을 보냈습니다.'}
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
          <h2 id="panel-title">
            {panel === 'fortune' ? '오늘의 운세' : '풍등날리기'}
          </h2>
          <button className="plaza-button" onClick={closePanel}>
            닫기
          </button>
        </div>
        {panel === 'fortune' && <FortunePanel />}
        <div hidden={panel !== 'wish'}>
          <WishPanel
            open={panel === 'wish'}
            onLaunch={launch}
            roomToken={world.roomToken}
          />
        </div>
      </dialog>
    </main>
  )
}

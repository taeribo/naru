import { useEffect, useRef, useState } from 'react'
import { DonationDialog } from '../features/DonationDialog'
import { WishPanel } from '../features/WishPanel'
import { PlazaScene } from '../scenes/PlazaScene'
import './app.css'

const FORTUNES = [
  '작은 시작이 오래 기억할 기쁨으로 이어집니다.',
  '뜻밖의 대화가 새로운 길을 열어 줍니다.',
  '한 걸음 천천히 가도 좋은 곳에 닿습니다.',
  '미뤄 둔 일에 손을 대면 마음이 한결 가벼워집니다.',
  '오래 품었던 생각을 꺼내 볼 때입니다.',
  '익숙한 길에서 새로운 즐거움을 만납니다.',
  '누군가에게 건넨 온기가 다시 당신에게 돌아옵니다.',
  '하루의 작은 여유가 다음 선택을 밝게 비춥니다.',
]

export function App() {
  const [panel, setPanel] = useState<'fortune' | 'wish' | null>(null)
  const [fortune, setFortune] = useState('')
  const [launchId, setLaunchId] = useState<number | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const launchCount = useRef(0)

  useEffect(() => {
    if (panel && !dialog.current?.open) dialog.current?.showModal()
    if (!panel && dialog.current?.open) dialog.current.close()
  }, [panel])

  useEffect(() => {
    if (launchId === null) return
    const timer = window.setTimeout(() => setLaunchId(null), 2_200)
    return () => window.clearTimeout(timer)
  }, [launchId])

  function launch() {
    launchCount.current += 1
    setLaunchId(launchCount.current)
    setPanel((current) => (current === 'wish' ? null : current))
  }

  return (
    <main className="plaza">
      <PlazaScene launchId={launchId} onComplete={() => setLaunchId(null)} />
      <header className="plaza-header">
        <h1>나루</h1>
        <nav aria-label="나루 체험">
          <button
            className="plaza-button"
            onClick={() => {
              setFortune(FORTUNES[Math.floor(Math.random() * FORTUNES.length)])
              setPanel('fortune')
            }}
          >
            <span aria-hidden="true">☾</span> 운세보기
          </button>
          <button
            className="plaza-button"
            disabled={launchId !== null}
            onClick={() => {
              setPanel('wish')
            }}
          >
            <span aria-hidden="true">◇</span> 풍등날리기
          </button>
        </nav>
        <DonationDialog />
      </header>
      <p className="world-help">
        드래그로 시점 이동 · 휠 또는 두 손가락으로 확대·축소
      </p>
      <p className="world-status" role="status">
        {launchId === null ? '' : '소원을 담은 풍등을 보냈습니다.'}
      </p>
      <dialog
        ref={dialog}
        className="plaza-panel"
        aria-labelledby="panel-title"
        onCancel={(event) => {
          event.preventDefault()
          setPanel(null)
        }}
      >
        <div className="panel-heading">
          <h2 id="panel-title">
            {panel === 'fortune' ? '오늘의 운세' : '풍등날리기'}
          </h2>
          <button className="plaza-button" onClick={() => setPanel(null)}>
            닫기
          </button>
        </div>
        {panel === 'fortune' && <p className="fortune-text">{fortune}</p>}
        <div hidden={panel !== 'wish'}>
          <WishPanel open={panel === 'wish'} onLaunch={launch} />
        </div>
      </dialog>
    </main>
  )
}

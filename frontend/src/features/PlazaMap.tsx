import { useRef, useState } from 'react'
import type { WorldPlayer } from '../services/world'
import { WORLD_BOUNDS } from '../scenes/terrain'

/**
 * 광장 지도 사진(public/map/overview.jpg)을 찍은 카메라의 투영 행렬.
 * 게임 좌표를 사진 위 위치로 바꿀 때 쓴다. 사진을 다시 찍으면(map-capture.html?overview)
 * 함께 저장되는 overview.json 값으로 바꿔 넣는다.
 */
const OVERVIEW = {
  width: 1400,
  height: 1150,
  matrix: [
    2.2568564516948686, 0, 0, 0, 0, 1.5002314455459316, -0.8379688380420673,
    -0.83775937201581, 0, -2.3017249575499226, -0.5461761176524188,
    -0.5460395906888761, 0, 11.508624787749616, 136.2542220344748,
    136.42013773950305,
  ],
}

type Place = {
  name: string
  sub: string
  photo: string
  x: number
  z: number
  /** 지도에서 짚을 수 있는 반경(미터). */
  r: number
}

/** 지도에서 짚을 수 있는 장소. 위치는 장면 배치와 같은 게임 좌표다. */
const PLACES: Place[] = [
  { name: '입구', sub: '정문', photo: 'entrance', x: 0, z: 46.5, r: 4.5 },
  {
    name: '노점 거리',
    sub: '먹거리 노점',
    photo: 'stalls',
    x: -9.4,
    z: 34,
    r: 5.5,
  },
  {
    name: '노점 거리',
    sub: '먹거리 노점',
    photo: 'stalls',
    x: 9.4,
    z: 34,
    r: 5.5,
  },
  {
    name: '도리이',
    sub: '계단 위 붉은 문',
    photo: 'torii',
    x: 0,
    z: 26.5,
    r: 5,
  },
  {
    name: '벚나무',
    sub: '광장 한가운데',
    photo: 'cherry',
    x: -7.8,
    z: 2.5,
    r: 9,
  },
  { name: '운세뽑기', sub: '오미쿠지', photo: 'fortune', x: -24, z: 5, r: 5 },
  { name: '소원패', sub: '에마 걸이', photo: 'wish', x: -31, z: -17, r: 5 },
  { name: '종울리기', sub: '종각', photo: 'bell', x: 24, z: 6, r: 5.5 },
  { name: '온천', sub: '노천탕', photo: 'onsen', x: 34, z: -14, r: 7 },
  {
    name: '온천 달걀',
    sub: '우물과 쉼터',
    photo: 'egg',
    x: -4,
    z: -30.5,
    r: 5.5,
  },
  { name: '본전', sub: '신사 안쪽', photo: 'sanctuary', x: 18.4, z: -31, r: 9 },
]

/** 게임 좌표 → 지도 사진 위 위치(%). */
function project(x: number, y: number, z: number) {
  const m = OVERVIEW.matrix
  const cx = m[0] * x + m[4] * y + m[8] * z + m[12]
  const cy = m[1] * x + m[5] * y + m[9] * z + m[13]
  const cw = m[3] * x + m[7] * y + m[11] * z + m[15]
  return { left: ((cx / cw + 1) / 2) * 100, top: ((1 - cy / cw) / 2) * 100 }
}

function spotWidth(place: Place) {
  const a = project(place.x - place.r, 1, place.z)
  const b = project(place.x + place.r, 1, place.z)
  return Math.abs(b.left - a.left)
}

/** 지도 사진 폴더(public/map). 배포 경로가 바뀌어도 맞도록 BASE_URL을 붙인다. */
const MAP_URL = `${import.meta.env.BASE_URL}map/`

const SPOTS = PLACES.map((place) => ({
  place,
  at: project(place.x, 1, place.z),
  width: spotWidth(place),
}))

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function PlazaMap({
  players,
  ownId,
  canMove,
  onMove,
}: {
  players: WorldPlayer[]
  ownId: string | null
  canMove: boolean
  onMove: (x: number, z: number) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState<number | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const shown = hovered ?? selected
  const hideTimer = useRef<number | undefined>(undefined)

  // 장소에서 말풍선으로 마우스를 옮기는 동안 말풍선이 사라지지 않게 잠깐 기다린다.
  function hoverOn(index: number) {
    window.clearTimeout(hideTimer.current)
    setHovered(index)
  }

  function hoverOff() {
    window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setHovered(null), 220)
  }
  const tip = shown === null ? null : SPOTS[shown]

  function show() {
    setOpen(true)
    dialog.current?.showModal()
  }

  function close() {
    dialog.current?.close()
    setOpen(false)
    setSelected(null)
    setHovered(null)
    trigger.current?.focus()
  }

  function walk(index: number) {
    const { place } = SPOTS[index]
    // 장소 바로 앞(입구 쪽)에 서도록 반경만큼 비켜서 걸어간다.
    onMove(
      clamp(place.x, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX),
      clamp(place.z + place.r + 1.5, WORLD_BOUNDS.minZ, WORLD_BOUNDS.maxZ),
    )
    close()
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="corner-button"
        aria-label="지도 열기"
        aria-haspopup="dialog"
        onClick={show}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z" />
          <path d="M9 4v13.5M15 6.5V20" />
        </svg>
        <small>지도</small>
      </button>
      <dialog
        ref={dialog}
        className="plaza-map"
        aria-labelledby="plaza-map-title"
        onCancel={(event) => {
          event.preventDefault()
          close()
        }}
        onClick={(event) => {
          if (event.target === dialog.current) close()
        }}
      >
        <div className="plaza-map__head">
          <h2 id="plaza-map-title">새 해 지도</h2>
          <button
            type="button"
            className="plaza-map__close"
            aria-label="지도 닫기"
            onClick={close}
          >
            ×
          </button>
        </div>
        <div className="plaza-map__frame">
          {open && (
            <div className="plaza-map__stage">
              <img
                className="plaza-map__photo"
                src={`${MAP_URL}overview.jpg`}
                alt="광장 전체를 위에서 내려다본 모습"
                draggable={false}
              />
              {SPOTS.map(({ place, at, width }, index) => (
                <button
                  key={`${place.photo}-${index}`}
                  type="button"
                  className={
                    selected === index
                      ? 'plaza-map__spot plaza-map__spot--on'
                      : 'plaza-map__spot'
                  }
                  aria-label={place.name}
                  style={{
                    left: `${at.left}%`,
                    top: `${at.top}%`,
                    width: `${width}%`,
                  }}
                  onMouseEnter={() => hoverOn(index)}
                  onMouseLeave={hoverOff}
                  onFocus={() => hoverOn(index)}
                  onBlur={hoverOff}
                  onClick={() => setSelected(index)}
                />
              ))}
              {players.map((player) => {
                const at = project(player.x, 0, player.z)
                const own = player.id === ownId
                return (
                  <span
                    key={player.id}
                    className={own ? 'plaza-map__me' : 'plaza-map__other'}
                    style={{ left: `${at.left}%`, top: `${at.top}%` }}
                  >
                    {own && <b>현위치</b>}
                  </span>
                )
              })}
              {tip && (
                <div
                  className="plaza-map__tip"
                  onMouseEnter={() => hoverOn(shown!)}
                  onMouseLeave={hoverOff}
                  style={{
                    left: `${tip.at.left}%`,
                    top: `${tip.at.top - tip.width * 0.6 * (OVERVIEW.width / OVERVIEW.height)}%`,
                  }}
                >
                  <img src={`${MAP_URL}${tip.place.photo}.jpg`} alt="" />
                  <div>
                    <strong>{tip.place.name}</strong>
                    <span>{tip.place.sub}</span>
                  </div>
                  <button
                    type="button"
                    className="plaza-map__walk"
                    onClick={() => walk(shown!)}
                    onFocus={() => hoverOn(shown!)}
                    onBlur={hoverOff}
                    disabled={!canMove}
                  >
                    여기로
                    <br />
                    걸어가기
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="plaza-map__foot">
          <div className="plaza-map__legend">
            <span>
              <i className="plaza-map__key--me" />
              현위치
            </span>
            <span>
              <i className="plaza-map__key--other" />
              다른 방문자
            </span>
          </div>
          <span>
            장소에 마우스를 올리거나 눌러서 이름을 보고, 그곳으로 걸어갈 수
            있어요
          </span>
        </div>
      </dialog>
    </>
  )
}

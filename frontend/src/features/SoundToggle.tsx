import { useEffect, useState } from 'react'
import { startAmbience, stopAmbience } from './ambience'

const STORAGE_KEY = 'naru.sound'

function savedChoice() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'on'
  } catch {
    return false
  }
}

/**
 * 오른쪽 위 소리 켜기/끄기. 기본은 꺼짐이고, 켠 선택은 다음 방문에도 기억한다.
 * 브라우저는 사용자가 화면을 누르기 전에는 소리를 막으므로, 저장된 선택이 켜짐이면
 * 첫 터치·클릭 때 소리를 시작한다.
 */
export function SoundToggle() {
  const [on, setOn] = useState(savedChoice)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off')
    } catch {
      // 저장하지 못해도 이번 방문에서는 그대로 동작한다.
    }
    if (!on) {
      stopAmbience()
      return
    }
    const begin = () => startAmbience()
    begin()
    window.addEventListener('pointerdown', begin, { once: true })
    window.addEventListener('keydown', begin, { once: true })
    return () => {
      window.removeEventListener('pointerdown', begin)
      window.removeEventListener('keydown', begin)
    }
  }, [on])

  useEffect(() => () => stopAmbience(), [])

  return (
    <button
      type="button"
      className={on ? 'corner-button' : 'corner-button corner-button--off'}
      aria-label={on ? '자연 소리 끄기' : '자연 소리 켜기'}
      aria-pressed={on}
      onClick={() => setOn(!on)}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path
          d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"
          fill="currentColor"
          fillOpacity=".25"
        />
        {on ? (
          <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
        ) : (
          <path d="M16 9.5l5 5M21 9.5l-5 5" />
        )}
      </svg>
      <small>{on ? '소리 켬' : '소리 끔'}</small>
    </button>
  )
}

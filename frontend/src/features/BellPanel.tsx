import { useState } from 'react'

async function playBell() {
  const audio = new AudioContext()
  try {
    await audio.resume()
    const start = audio.currentTime
    const overtone = [
      [174, 0.21, 2.3],
      [283, 0.11, 1.65],
      [487, 0.065, 1.15],
      [729, 0.03, 0.6],
    ]
    await Promise.all(
      overtone.map(([frequency, volume, duration]) => {
        const tone = audio.createOscillator()
        const envelope = audio.createGain()
        tone.frequency.value = frequency
        envelope.gain.setValueAtTime(0.001, start)
        envelope.gain.exponentialRampToValueAtTime(volume, start + 0.025)
        envelope.gain.exponentialRampToValueAtTime(0.001, start + duration)
        tone.connect(envelope).connect(audio.destination)
        return new Promise<void>((resolve) => {
          tone.onended = () => resolve()
          tone.start(start)
          tone.stop(start + duration)
        })
      }),
    )
  } finally {
    await audio.close()
  }
}

export function BellPanel() {
  const [ringing, setRinging] = useState(false)
  const [status, setStatus] = useState('')

  async function ring() {
    setRinging(true)
    setStatus('종을 울렸어요.')
    try {
      await playBell()
    } catch {
      setStatus('이 기기에서 종소리를 재생할 수 없어요.')
    } finally {
      setRinging(false)
    }
  }

  return (
    <div className="zone-panel">
      <button
        type="button"
        className="plaza-button"
        disabled={ringing}
        onClick={() => void ring()}
      >
        {ringing ? '종소리가 울리는 중…' : '종 울리기'}
      </button>
      <p role="status">{status}</p>
    </div>
  )
}

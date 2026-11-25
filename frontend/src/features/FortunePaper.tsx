import { useEffect, useRef, useState } from 'react'

const UNFOLD_DURATION = 1_000

function playPaperSound() {
  let audio: AudioContext | undefined
  try {
    audio = new AudioContext()
    const context = audio
    const duration = 0.48
    const buffer = context.createBuffer(
      1,
      Math.round(context.sampleRate * duration),
      context.sampleRate,
    )
    const samples = buffer.getChannelData(0)
    for (let index = 0; index < samples.length; index++) {
      const t = index / samples.length
      const folds =
        Math.sin(Math.PI * t) * (0.45 + 0.55 * Math.sin(10 * t) ** 2)
      samples[index] = (Math.random() * 2 - 1) * folds
    }

    const paper = context.createBufferSource()
    paper.buffer = buffer
    const texture = context.createBiquadFilter()
    texture.type = 'bandpass'
    texture.frequency.value = 1_850
    texture.Q.value = 0.65
    const gain = context.createGain()
    gain.gain.value = 0.075
    paper.connect(texture).connect(gain).connect(context.destination)

    const release = () => void context.close().catch(() => {})
    paper.onended = release
    paper.start()
    void context.resume().catch(release)
  } catch {
    void audio?.close().catch(() => {})
  }
}

export function FortunePaper({ message }: { message: string }) {
  const [phase, setPhase] = useState<'folded' | 'unfolding' | 'open'>('folded')
  const started = useRef(false)
  const timer = useRef<number | undefined>(undefined)
  const fold = useRef<HTMLButtonElement>(null)
  const text = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    fold.current?.focus({ preventScroll: true })
    return () => window.clearTimeout(timer.current)
  }, [])

  useEffect(() => {
    if (phase === 'open') text.current?.focus({ preventScroll: true })
  }, [phase])

  function unfold() {
    if (started.current) return
    started.current = true
    playPaperSound()

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase('open')
      return
    }
    setPhase('unfolding')
    timer.current = window.setTimeout(
      () => setPhase('open'),
      UNFOLD_DURATION + 120,
    )
  }

  return (
    <div
      className="fortune-paper-stage"
      data-phase={phase}
      style={
        { '--unfold-duration': `${UNFOLD_DURATION}ms` } as Record<
          string,
          string
        >
      }
    >
      <div className="fortune-paper-space">
        {phase !== 'open' && (
          <button
            ref={fold}
            type="button"
            className="fortune-fold"
            aria-label="한지 펼치기"
            aria-describedby="fortune-paper-instruction"
            disabled={phase === 'unfolding'}
            onClick={unfold}
          />
        )}
        {phase !== 'folded' && (
          <div
            className="fortune-paper-unfold"
            onAnimationEnd={(event) => {
              if (
                event.target !== event.currentTarget ||
                event.animationName !== 'fortune-unfold'
              )
                return
              window.clearTimeout(timer.current)
              setPhase('open')
            }}
          >
            <article className="fortune-paper" aria-label="오늘의 운세">
              <div aria-live="polite" aria-atomic="true">
                {phase === 'open' && (
                  <p ref={text} tabIndex={-1} className="fortune-paper-message">
                    {message}
                  </p>
                )}
              </div>
            </article>
          </div>
        )}
      </div>
      {phase !== 'open' ? (
        <p className="fortune-paper-note" id="fortune-paper-instruction">
          한지를 눌러 오늘의 운세를 펼쳐보세요.
        </p>
      ) : (
        <p className="fortune-paper-note fortune-paper-caption">
          오늘 당신에게 찾아온 작은 이야기
        </p>
      )}
    </div>
  )
}

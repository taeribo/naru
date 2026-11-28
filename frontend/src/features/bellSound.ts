/** 범종 소리: 낮은 울림과 배음 몇 개를 겹쳐 길게 잦아들게 한다. */
export async function playBell() {
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

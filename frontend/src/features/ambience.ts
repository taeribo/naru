/**
 * 광장 자연 소리: 겨울 밤바람을 바탕에 깔고 풍경과 아주 작은 화톳불 소리를 섞는다.
 * 음원 파일 없이 Web Audio로 직접 만들어 낸다.
 */
type Stop = () => void

const MIX = { wind: 0.8, furin: 0.7, fire: 0.35 }
const VOLUME = 0.6

function noiseSource(context: AudioContext, seconds: number, brown = false) {
  const buffer = context.createBuffer(
    1,
    Math.floor(context.sampleRate * seconds),
    context.sampleRate,
  )
  const data = buffer.getChannelData(0)
  let last = 0
  for (let index = 0; index < data.length; index += 1) {
    const white = Math.random() * 2 - 1
    if (brown) {
      last = (last + 0.02 * white) / 1.02
      data[index] = last * 3.5
    } else {
      data[index] = white
    }
  }
  const source = context.createBufferSource()
  source.buffer = buffer
  source.loop = true
  return source
}

/** 숲 위를 천천히 지나가는 바람. 세기와 결이 2초마다 조금씩 바뀐다. */
function wind(context: AudioContext, out: AudioNode): Stop {
  const source = noiseSource(context, 6, true)
  const filter = context.createBiquadFilter()
  const gain = context.createGain()
  filter.type = 'bandpass'
  filter.frequency.value = 420
  filter.Q.value = 0.6
  gain.gain.value = 0.35
  source.connect(filter).connect(gain).connect(out)
  source.start()
  const timer = window.setInterval(() => {
    const now = context.currentTime
    filter.frequency.setTargetAtTime(250 + Math.random() * 650, now, 1.6)
    gain.gain.setTargetAtTime(0.18 + Math.random() * 0.4, now, 1.8)
  }, 2200)
  return () => {
    window.clearInterval(timer)
    source.stop()
  }
}

/** 처마 끝 유리 풍경이 가끔 맑게 울린다. */
function furin(context: AudioContext, out: AudioNode): Stop {
  const ring = () => {
    const now = context.currentTime
    const base = [1568, 1760, 2093, 2349][Math.floor(Math.random() * 4)]
    for (const [ratio, level] of [
      [1, 0.09],
      [2.76, 0.035],
      [5.4, 0.015],
    ]) {
      const tone = context.createOscillator()
      const gain = context.createGain()
      tone.frequency.value = base * ratio
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(level, now + 0.005)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.6 / ratio + 0.4)
      tone.connect(gain).connect(out)
      tone.start(now)
      tone.stop(now + 3.2)
    }
  }
  let timer = 0
  const next = () => {
    ring()
    if (Math.random() < 0.4) window.setTimeout(ring, 180 + Math.random() * 260)
    timer = window.setTimeout(next, 2200 + Math.random() * 4800)
  }
  timer = window.setTimeout(next, 600)
  return () => window.clearTimeout(timer)
}

/** 낮게 웅웅거리다 가끔 타닥 튀는 화톳불. */
function fire(context: AudioContext, out: AudioNode): Stop {
  const source = noiseSource(context, 5, true)
  const filter = context.createBiquadFilter()
  const gain = context.createGain()
  filter.type = 'lowpass'
  filter.frequency.value = 260
  gain.gain.value = 0.22
  source.connect(filter).connect(gain).connect(out)
  source.start()
  const crack = () => {
    const now = context.currentTime
    const burst = noiseSource(context, 0.05)
    const high = context.createBiquadFilter()
    const level = context.createGain()
    high.type = 'highpass'
    high.frequency.value = 1800 + Math.random() * 2500
    level.gain.setValueAtTime(0.06 + Math.random() * 0.2, now)
    level.gain.exponentialRampToValueAtTime(
      0.0001,
      now + 0.01 + Math.random() * 0.03,
    )
    burst.connect(high).connect(level).connect(out)
    burst.start(now)
    burst.stop(now + 0.05)
  }
  let timer = 0
  const next = () => {
    crack()
    if (Math.random() < 0.3) window.setTimeout(crack, 30)
    timer = window.setTimeout(
      next,
      40 + Math.random() * (Math.random() < 0.8 ? 260 : 1200),
    )
  }
  next()
  return () => {
    window.clearTimeout(timer)
    source.stop()
  }
}

const LAYERS = { wind, furin, fire }

let context: AudioContext | undefined
let master: GainNode | undefined
let stops: Stop[] = []

/** 소리를 켠다. 브라우저 정책상 사용자가 화면을 누른 뒤에 불러야 한다. */
export function startAmbience() {
  context ??= new AudioContext()
  if (context.state === 'suspended') void context.resume()
  if (stops.length) return
  master = context.createGain()
  master.gain.value = 0
  master.gain.setTargetAtTime(VOLUME, context.currentTime, 0.8)
  master.connect(context.destination)
  stops = Object.entries(MIX).map(([name, level]) => {
    const gain = context!.createGain()
    gain.gain.value = level
    gain.connect(master!)
    return LAYERS[name as keyof typeof LAYERS](context!, gain)
  })
}

/** 소리를 천천히 줄이며 끈다. */
export function stopAmbience() {
  if (!context || !master || !stops.length) return
  const fading = master
  const layers = stops
  stops = []
  fading.gain.setTargetAtTime(0, context.currentTime, 0.25)
  window.setTimeout(() => {
    layers.forEach((stop) => stop())
    fading.disconnect()
  }, 900)
}

import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

type Draw = (ctx: CanvasRenderingContext2D, size: number) => void

function canvasTexture(size: number, draw: Draw) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) draw(ctx, size)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

function once(create: () => CanvasTexture) {
  let cache: CanvasTexture | null = null
  return () => (cache ??= create())
}

function seeded(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

export const getGlowTexture = once(() =>
  canvasTexture(128, (ctx, size) => {
    const half = size / 2
    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.22, 'rgba(255,255,255,0.5)')
    gradient.addColorStop(0.55, 'rgba(255,255,255,0.1)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
  }),
)

function petalPath(ctx: CanvasRenderingContext2D, length: number) {
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.bezierCurveTo(
    -length * 0.34,
    -length * 0.22,
    -length * 0.4,
    -length * 0.78,
    -length * 0.13,
    -length * 0.96,
  )
  ctx.quadraticCurveTo(0, -length * 0.84, length * 0.13, -length * 0.96)
  ctx.bezierCurveTo(
    length * 0.4,
    -length * 0.78,
    length * 0.34,
    -length * 0.22,
    0,
    0,
  )
  ctx.closePath()
}

export const getBlossomTexture = once(() =>
  canvasTexture(256, (ctx, size) => {
    const half = size / 2
    const length = half * 0.97
    for (let index = 0; index < 5; index += 1) {
      ctx.save()
      ctx.translate(half, half)
      ctx.rotate((index * Math.PI * 2) / 5)
      const gradient = ctx.createLinearGradient(0, 0, 0, -length)
      gradient.addColorStop(0, '#e0568f')
      gradient.addColorStop(0.35, '#f59bbf')
      gradient.addColorStop(1, '#fff0f6')
      ctx.fillStyle = gradient
      petalPath(ctx, length)
      ctx.fill()
      ctx.strokeStyle = 'rgba(214,90,140,0.35)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(0, -length * 0.1)
      ctx.lineTo(0, -length * 0.62)
      ctx.stroke()
      ctx.restore()
    }
    ctx.save()
    ctx.translate(half, half)
    for (let index = 0; index < 11; index += 1) {
      const angle = (index / 11) * Math.PI * 2
      ctx.strokeStyle = '#d4527f'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(Math.cos(angle) * 34, Math.sin(angle) * 34)
      ctx.stroke()
      ctx.fillStyle = '#ffe28a'
      ctx.beginPath()
      ctx.arc(Math.cos(angle) * 36, Math.sin(angle) * 36, 4.2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }),
)

export const getPetalTexture = once(() =>
  canvasTexture(64, (ctx, size) => {
    ctx.translate(size / 2, size * 0.96)
    const length = size * 0.92
    const gradient = ctx.createLinearGradient(0, 0, 0, -length)
    gradient.addColorStop(0, '#f08ab0')
    gradient.addColorStop(1, '#ffe6f0')
    ctx.fillStyle = gradient
    petalPath(ctx, length)
    ctx.fill()
  }),
)

export const getMoonTexture = once(() =>
  canvasTexture(256, (ctx, size) => {
    const half = size / 2
    const base = ctx.createRadialGradient(
      half * 0.8,
      half * 0.75,
      0,
      half,
      half,
      half,
    )
    base.addColorStop(0, '#fffaf0')
    base.addColorStop(1, '#f1d7a6')
    ctx.fillStyle = base
    ctx.fillRect(0, 0, size, size)
    const random = seeded(11)
    for (let index = 0; index < 26; index += 1) {
      const radius = 8 + random() * 30
      const x = random() * size
      const y = random() * size
      const crater = ctx.createRadialGradient(x, y, 0, x, y, radius)
      crater.addColorStop(0, 'rgba(176,140,98,0.38)')
      crater.addColorStop(1, 'rgba(176,140,98,0)')
      ctx.fillStyle = crater
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()
    }
  }),
)

export const getPaperTexture = once(() =>
  canvasTexture(512, (ctx, size) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, size)
    gradient.addColorStop(0, '#ffb76a')
    gradient.addColorStop(0.55, '#ffd9a0')
    gradient.addColorStop(1, '#fff0c4')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
    const random = seeded(9)
    for (let index = 0; index < 400; index += 1) {
      ctx.strokeStyle = `rgba(190,110,50,${0.03 + random() * 0.05})`
      const x = random() * size
      const y = random() * size
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + (random() - 0.5) * 40, y + (random() - 0.5) * 40)
      ctx.stroke()
    }
    ctx.strokeStyle = '#8c3a22'
    ctx.lineWidth = 12
    ctx.strokeRect(14, 14, size - 28, size - 28)
    ctx.lineWidth = 3
    ctx.strokeRect(34, 34, size - 68, size - 68)
    for (const [x, y] of [
      [90, 90],
      [size - 90, size - 90],
    ]) {
      ctx.save()
      ctx.translate(x, y)
      ctx.fillStyle = 'rgba(214,70,110,0.55)'
      for (let petal = 0; petal < 5; petal += 1) {
        ctx.rotate((Math.PI * 2) / 5)
        petalPath(ctx, 34)
        ctx.fill()
      }
      ctx.restore()
    }
    ctx.fillStyle = '#9c1f1f'
    ctx.font = `700 300px "Yu Mincho", "MS Mincho", "Noto Serif JP", "Batang", serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('願', size / 2, size * 0.54)
  }),
)

export const getWoodTexture = once(() => {
  const texture = canvasTexture(256, (ctx, size) => {
    ctx.fillStyle = '#c98a4e'
    ctx.fillRect(0, 0, size, size)
    const random = seeded(31)
    for (let index = 0; index < 260; index += 1) {
      ctx.fillStyle =
        random() < 0.5 ? 'rgba(110,60,25,0.16)' : 'rgba(240,190,120,0.14)'
      ctx.fillRect(
        random() * size,
        random() * size,
        1 + random() * 2,
        30 + random() * 120,
      )
    }
    ctx.fillStyle = 'rgba(70,35,15,0.6)'
    for (let plank = 0; plank < 8; plank += 1) {
      ctx.fillRect(plank * (size / 8), 0, 3, size)
    }
  })
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  return texture
})

function createDoorTexture(flower: string, seed: number) {
  return canvasTexture(256, (ctx, size) => {
    ctx.fillStyle = '#b57a42'
    ctx.fillRect(0, 0, size, size)
    ctx.strokeStyle = '#6b3d1c'
    ctx.lineWidth = 8
    ctx.strokeRect(4, 4, size - 8, size - 8)
    const random = seeded(seed)
    ctx.fillStyle = '#f3e6c6'
    ctx.fillRect(size * 0.3, size * 0.1, size * 0.4, size * 0.34)
    ctx.strokeStyle = 'rgba(40,25,15,0.7)'
    ctx.lineWidth = 3
    for (let stroke = 0; stroke < 6; stroke += 1) {
      const x = size * (0.36 + stroke * 0.045)
      ctx.beginPath()
      ctx.moveTo(x, size * 0.15)
      ctx.lineTo(
        x + (random() - 0.5) * 6,
        size * 0.15 + size * (0.1 + random() * 0.15),
      )
      ctx.stroke()
    }
    const cx = size / 2
    const cy = size * 0.7
    ctx.fillStyle = '#1b1a1c'
    ctx.beginPath()
    ctx.arc(cx, cy, size * 0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.save()
    ctx.translate(cx, cy)
    ctx.fillStyle = flower
    for (let petal = 0; petal < 6; petal += 1) {
      ctx.rotate(Math.PI / 3)
      ctx.beginPath()
      ctx.ellipse(0, -size * 0.09, size * 0.05, size * 0.075, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = '#f3e6c6'
    ctx.beginPath()
    ctx.arc(0, 0, size * 0.035, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  })
}

export const getDoorTextures = once(() => createDoorTexture('#e8446f', 3))
export const getDoorTexturesAlt = once(() => createDoorTexture('#d0343a', 8))

export const getSignTexture = once(() => {
  const texture = canvasTexture(512, (ctx, size) => {
    ctx.fillStyle = '#1b1a1d'
    ctx.fillRect(0, 0, size, size)
    ctx.strokeStyle = '#6a5a48'
    ctx.lineWidth = 10
    ctx.strokeRect(12, 12, size - 24, size - 24)
    ctx.fillStyle = '#f7f1e4'
    ctx.font = `700 ${size * 0.4}px "Nanum Myeongjo", "AppleMyungjo", "Batang", serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.scale(0.5, 1)
    ctx.font = `700 ${size * 0.36}px "Yu Mincho", "MS Mincho", "Noto Serif JP", "Batang", serif`
    ctx.fillText('おみくじ', size, size * 0.52)
  })
  return texture
})

export const getBarkTexture = once(() => {
  const texture = canvasTexture(256, (ctx, size) => {
    ctx.fillStyle = '#4b2e3a'
    ctx.fillRect(0, 0, size, size)
    const random = seeded(23)
    for (let index = 0; index < 340; index += 1) {
      const x = random() * size
      const width = 1 + random() * 5
      const dark = random() < 0.55
      ctx.fillStyle = dark
        ? `rgba(28,14,24,${0.25 + random() * 0.35})`
        : `rgba(138,96,104,${0.12 + random() * 0.22})`
      ctx.fillRect(x, random() * size, width, 20 + random() * 110)
    }
  })
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  return texture
})

export const getSlabTexture = once(() => {
  const texture = canvasTexture(512, (ctx, size) => {
    ctx.fillStyle = '#b9b4c6'
    ctx.fillRect(0, 0, size, size)
    const random = seeded(12)
    let top = 0
    ;[150, 190, 172].forEach((height, row) => {
      const count = 2 + (row % 2)
      let x = 0
      for (let index = 0; index < count; index += 1) {
        const width =
          index === count - 1 ? size - x : size / count + (random() - 0.5) * 80
        const tone = 128 + random() * 34
        ctx.fillStyle = `rgb(${tone + 14},${tone + 8},${tone + 30})`
        ctx.fillRect(x + 3, top + 3, width - 6, height - 6)
        for (let spot = 0; spot < 40; spot += 1) {
          ctx.fillStyle = `rgba(${random() < 0.5 ? '255,255,255' : '40,30,60'},${0.03 + random() * 0.06})`
          ctx.beginPath()
          ctx.arc(
            x + random() * width,
            top + random() * height,
            5 + random() * 24,
            0,
            Math.PI * 2,
          )
          ctx.fill()
        }
        ctx.strokeStyle = 'rgba(60,50,80,0.35)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        let cx = x + random() * width
        let cy = top + 4
        ctx.moveTo(cx, cy)
        for (let step = 0; step < 5; step += 1) {
          cx += (random() - 0.5) * 40
          cy += height / 6
          ctx.lineTo(cx, cy)
        }
        ctx.stroke()
        x += width
      }
      top += height
    })
  })
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(0.25, 0.25)
  return texture
})

export const getFacadeTexture = once(() =>
  canvasTexture(256, (ctx, size) => {
    ctx.fillStyle = '#4a2a1c'
    ctx.fillRect(0, 0, size, size)
    const random = seeded(61)
    for (let index = 0; index < 120; index += 1) {
      ctx.fillStyle = `rgba(20,10,5,${0.1 + random() * 0.15})`
      ctx.fillRect(random() * size, 0, 1 + random() * 2, size)
    }
    for (let window = 0; window < 3; window += 1) {
      const x = 20 + window * 76
      ctx.fillStyle = '#d9a468'
      ctx.fillRect(x, 54, 62, 150)
      ctx.strokeStyle = '#2e170c'
      ctx.lineWidth = 3
      for (let bar = 1; bar < 4; bar += 1) {
        ctx.beginPath()
        ctx.moveTo(x + (62 / 4) * bar, 54)
        ctx.lineTo(x + (62 / 4) * bar, 204)
        ctx.stroke()
      }
      for (let bar = 1; bar < 6; bar += 1) {
        ctx.beginPath()
        ctx.moveTo(x, 54 + (150 / 6) * bar)
        ctx.lineTo(x + 62, 54 + (150 / 6) * bar)
        ctx.stroke()
      }
      ctx.lineWidth = 6
      ctx.strokeRect(x, 54, 62, 150)
    }
    ctx.fillStyle = '#2e170c'
    ctx.fillRect(0, 0, size, 28)
    ctx.fillRect(0, size - 22, size, 22)
  }),
)

export const getFacadeGlowTexture = once(() =>
  canvasTexture(256, (ctx, size) => {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, size, size)
    for (let window = 0; window < 3; window += 1) {
      const x = 20 + window * 76
      const gradient = ctx.createLinearGradient(0, 54, 0, 204)
      gradient.addColorStop(0, '#ff8a2c')
      gradient.addColorStop(1, '#ffc46a')
      ctx.fillStyle = gradient
      ctx.fillRect(x, 54, 62, 150)
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 3
      for (let bar = 1; bar < 4; bar += 1) {
        ctx.beginPath()
        ctx.moveTo(x + (62 / 4) * bar, 54)
        ctx.lineTo(x + (62 / 4) * bar, 204)
        ctx.stroke()
      }
      for (let bar = 1; bar < 6; bar += 1) {
        ctx.beginPath()
        ctx.moveTo(x, 54 + (150 / 6) * bar)
        ctx.lineTo(x + 62, 54 + (150 / 6) * bar)
        ctx.stroke()
      }
    }
  }),
)

export const getRoofTileTexture = once(() => {
  const texture = canvasTexture(128, (ctx, size) => {
    ctx.fillStyle = '#4a5068'
    ctx.fillRect(0, 0, size, size)
    ctx.strokeStyle = '#242838'
    ctx.lineWidth = 3
    for (let line = 0; line < 8; line += 1) {
      ctx.beginPath()
      ctx.moveTo((size / 8) * line + 2, 0)
      ctx.lineTo((size / 8) * line + 2, size)
      ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(20,22,34,0.5)'
    for (let row = 0; row < 8; row += 1) {
      ctx.beginPath()
      ctx.moveTo(0, (size / 8) * row)
      ctx.lineTo(size, (size / 8) * row)
      ctx.stroke()
    }
  })
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  return texture
})

function drawCastleWindows(ctx: CanvasRenderingContext2D, glowing: boolean) {
  for (let column = 0; column < 4; column += 1) {
    const x = 18 + column * 58
    if (glowing) {
      const gradient = ctx.createLinearGradient(0, 70, 0, 200)
      gradient.addColorStop(0, '#ff9a3c')
      gradient.addColorStop(1, '#ffd27a')
      ctx.fillStyle = gradient
      ctx.fillRect(x, 70, 40, 100)
    } else {
      ctx.fillStyle = '#3a2a2a'
      ctx.fillRect(x - 5, 65, 50, 110)
      ctx.fillStyle = '#d9a468'
      ctx.fillRect(x, 70, 40, 100)
    }
    ctx.strokeStyle = glowing ? '#000' : '#2e1a14'
    ctx.lineWidth = 3
    for (let bar = 1; bar < 3; bar += 1) {
      ctx.beginPath()
      ctx.moveTo(x + (40 / 3) * bar, 70)
      ctx.lineTo(x + (40 / 3) * bar, 170)
      ctx.stroke()
    }
    for (let bar = 1; bar < 5; bar += 1) {
      ctx.beginPath()
      ctx.moveTo(x, 70 + 20 * bar)
      ctx.lineTo(x + 40, 70 + 20 * bar)
      ctx.stroke()
    }
  }
}

export const getCastleWallTexture = once(() =>
  canvasTexture(256, (ctx, size) => {
    ctx.fillStyle = '#efebe2'
    ctx.fillRect(0, 0, size, size)
    const random = seeded(77)
    for (let index = 0; index < 160; index += 1) {
      ctx.fillStyle = `rgba(120,110,100,${0.04 + random() * 0.08})`
      ctx.fillRect(
        random() * size,
        random() * size,
        2 + random() * 20,
        2 + random() * 6,
      )
    }
    ctx.fillStyle = '#cfc8ba'
    ctx.fillRect(0, 0, size, 26)
    ctx.fillStyle = '#23232c'
    ctx.fillRect(0, size - 38, size, 38)
    ctx.strokeStyle = '#efebe2'
    ctx.lineWidth = 2
    for (let line = 0; line < 16; line += 1) {
      ctx.beginPath()
      ctx.moveTo(line * 16, size - 38)
      ctx.lineTo(line * 16 + 38, size)
      ctx.stroke()
    }
    drawCastleWindows(ctx, false)
  }),
)

export const getCastleGlowTexture = once(() =>
  canvasTexture(256, (ctx, size) => {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, size, size)
    drawCastleWindows(ctx, true)
  }),
)

export const getCastleSignTexture = once(() =>
  canvasTexture(512, (ctx, size) => {
    ctx.fillStyle = '#2a1a12'
    ctx.fillRect(0, 0, size, size)
    ctx.strokeStyle = '#e8b84a'
    ctx.lineWidth = 14
    ctx.strokeRect(10, 10, size - 20, size - 20)
    ctx.fillStyle = '#f0c860'
    ctx.font = `700 ${size * 0.42}px "Nanum Myeongjo", "AppleMyungjo", "Batang", serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.scale(0.31, 1)
    ctx.font = `700 ${size * 0.5}px "Yu Mincho", "MS Mincho", "Noto Serif JP", "Batang", serif`
    ctx.fillText('夜桜', size / 0.62, size * 0.54)
  }),
)

export const getNoboriTexture = once(() =>
  canvasTexture(256, (ctx, size) => {
    ctx.fillStyle = '#c8302a'
    ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = '#f4efe6'
    ctx.fillRect(0, 0, 10, size)
    ctx.fillRect(size - 10, 0, 10, size)
    ctx.font = `900 ${size * 0.62}px "Yu Mincho", "MS Mincho", "Noto Serif JP", "Batang", serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.save()
    ctx.scale(1, 0.34)
    for (const [index, char] of ['夜', '桜', '祭'].entries()) {
      ctx.fillText(char, size / 2, 130 + index * 245)
    }
    ctx.restore()
  }),
)

export const getGravelTexture = once(() => {
  const texture = canvasTexture(256, (ctx, size) => {
    ctx.fillStyle = '#322a48'
    ctx.fillRect(0, 0, size, size)
    const random = seeded(55)
    for (let index = 0; index < 1400; index += 1) {
      const tone = random() < 0.5 ? '10,6,24' : '120,108,150'
      ctx.fillStyle = `rgba(${tone},${0.1 + random() * 0.18})`
      ctx.beginPath()
      ctx.arc(
        random() * size,
        random() * size,
        1 + random() * 2.4,
        0,
        Math.PI * 2,
      )
      ctx.fill()
    }
  })
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  return texture
})

export const getEmaTexture = once(() =>
  canvasTexture(128, (ctx, size) => {
    ctx.clearRect(0, 0, size, size)
    const outline = [
      [size * 0.5, size * 0.06],
      [size * 0.94, size * 0.34],
      [size * 0.94, size * 0.94],
      [size * 0.06, size * 0.94],
      [size * 0.06, size * 0.34],
    ]
    ctx.beginPath()
    outline.forEach(([x, y], index) =>
      index ? ctx.lineTo(x, y) : ctx.moveTo(x, y),
    )
    ctx.closePath()
    ctx.fillStyle = '#d9a468'
    ctx.fill()
    ctx.strokeStyle = '#6b3d1c'
    ctx.lineWidth = 5
    ctx.stroke()
    ctx.strokeStyle = '#c2382a'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(size * 0.5, size * 0.06)
    ctx.lineTo(size * 0.5, 0)
    ctx.stroke()
    ctx.fillStyle = '#9c1f1f'
    ctx.font = `700 ${size * 0.5}px "Yu Mincho", "MS Mincho", "Noto Serif JP", "Batang", serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('願', size / 2, size * 0.64)
  }),
)

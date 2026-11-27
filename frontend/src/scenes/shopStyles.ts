export type ShopKind =
  | 'okonomiyaki'
  | 'dango'
  | 'fruit'
  | 'yakisoba'
  | 'takoyaki'
  | 'izakaya'

export interface Style {
  width: number
  frame: string
  cloth: string
  text: string
  roof: 'gable' | 'shed' | 'tent'
  stripes?: [string, string]
  walls: boolean
}

/** 가게마다 폭, 뼈대 색, 노렌, 지붕 모양이 다르다. */
export const STYLES: Record<ShopKind, Style> = {
  okonomiyaki: {
    width: 4.2,
    frame: '#8a2f22',
    cloth: '#8c2b24',
    text: 'お',
    roof: 'gable',
    walls: true,
  },
  dango: {
    width: 3.4,
    frame: '#b58f5e',
    cloth: '#c9808f',
    text: '団',
    roof: 'shed',
    walls: true,
  },
  fruit: {
    width: 4.0,
    frame: '#80603c',
    cloth: '#3f6a46',
    text: '果',
    roof: 'tent',
    stripes: ['#3f6a46', '#ece3cc'],
    walls: false,
  },
  yakisoba: {
    width: 4.4,
    frame: '#3a2a20',
    cloth: '#b8862e',
    text: '麺',
    roof: 'gable',
    walls: true,
  },
  takoyaki: {
    width: 3.2,
    frame: '#2d3f63',
    cloth: '#2a4a7a',
    text: '蛸',
    roof: 'tent',
    stripes: ['#2a4a7a', '#ece3cc'],
    walls: false,
  },
  izakaya: {
    width: 5.8,
    frame: '#4a2a1f',
    cloth: '#233059',
    text: '酒',
    roof: 'gable',
    walls: true,
  },
}

/** 노렌(처마 휘장): 앞 보에 걸린 짧은 천. */
export const NOREN_HEIGHT = 0.45
export const NOREN_Y = 2.64

export function norenPanels(kind: ShopKind) {
  const { width } = STYLES[kind]
  const panels = kind === 'izakaya' ? 4 : 3
  return { panels, panelWidth: (width - 0.4) / panels }
}

import type { FeedItemId, PlayItemId } from './petTypes'

export const feedItems: Array<{
  id: FeedItemId
  name: string
  detail: string
}> = [
  {
    id: 'meatCan',
    name: '肉罐头',
    detail: '最顶饱'
  },
  {
    id: 'jerky',
    name: '小肉干',
    detail: '最开心'
  },
  {
    id: 'water',
    name: '清水',
    detail: '润润嗓子'
  }
]

export const playItems: Array<{
  id: PlayItemId
  name: string
  detail: string
}> = [
  {
    id: 'ball',
    name: '丢小球',
    detail: '跑一圈'
  },
  {
    id: 'tug',
    name: '拔河',
    detail: '它不松口'
  }
]

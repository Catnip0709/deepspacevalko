import { Gift, MapPin, type LucideIcon } from 'lucide-react'
import type { ChatMessageType } from '../../app/types'

export type WechatActionId = Extract<ChatMessageType, 'location' | 'redPacket'>

export type WechatAction = {
  id: WechatActionId
  label: string
  description: string
  Icon: LucideIcon
}

export const wechatActions: WechatAction[] = [
  {
    id: 'location',
    label: '定位',
    description: '发送当前位置',
    Icon: MapPin
  },
  {
    id: 'redPacket',
    label: '红包',
    description: '给他发红包',
    Icon: Gift
  }
]

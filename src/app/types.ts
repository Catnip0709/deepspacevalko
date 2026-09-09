import type { LucideIcon } from 'lucide-react'

export type Screen = 'desktop' | 'wechat' | 'settings' | 'hisPhone'
export type WechatTab = 'chats' | 'moments'
export type SettingsView = 'list' | 'unlock' | 'deepseek'
export type MomentAuthor = 'aoyin' | 'hunter'
export type ChatRole = 'user' | 'assistant'
export type ChatMessageType = 'text' | 'location' | 'redPacket'
export type DeepSeekModel = 'deepseek-v4-flash' | 'deepseek-v4-pro'

export type ChatLocationPayload = {
  place: string
  note?: string
}

export type ChatRedPacketPayload = {
  amount: string
  note?: string
}

export type ChatMessage = {
  id: string
  role: ChatRole
  type?: ChatMessageType
  content: string
  createdAt: string
  location?: ChatLocationPayload
  redPacket?: ChatRedPacketPayload
}

export type MomentReply = {
  id: string
  author: MomentAuthor
  text: string
  pending?: boolean
}

export type Moment = {
  id: string
  author: MomentAuthor
  authorName: string
  time: string
  text: string
  replies: MomentReply[]
}

export type AppIcon = {
  id: Screen | 'his-phone' | 'note'
  label: string
  description: string
  Icon: LucideIcon
  accent: string
}

export type WeatherIconId = 'fog' | 'sun' | 'rain' | 'wind'

export type WeatherScene = {
  id: string
  period: string
  temperature: string
  condition: string
  detail: string
  reminders: string[]
  icon: WeatherIconId
}

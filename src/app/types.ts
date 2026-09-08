import type { LucideIcon } from 'lucide-react'

export type Screen = 'desktop' | 'wechat' | 'settings' | 'hisPhone'
export type WechatTab = 'chats' | 'moments'
export type SettingsView = 'list' | 'unlock' | 'deepseek'
export type MomentAuthor = 'aoyin' | 'hunter'
export type ChatRole = 'user' | 'assistant'
export type DeepSeekModel = 'deepseek-v4-flash' | 'deepseek-v4-pro'

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  createdAt: string
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

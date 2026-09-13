export type WeiboTab = 'trending' | 'feed' | 'profile'
export type WeiboAuthorKind = 'hunter' | 'aoyin' | 'npc'
export type HotSearchTag = '沸' | '热' | '新'

export type WeiboAuthor = {
  id: string
  kind: WeiboAuthorKind
  name: string
  avatar: string
  bio?: string
}

export type WeiboReply = {
  id: string
  author: WeiboAuthor
  text: string
  createdAt: number
}

export type WeiboComment = {
  id: string
  author: WeiboAuthor
  text: string
  createdAt: number
  reply?: WeiboReply
  replyStatus?: 'pending' | 'failed'
}

export type WeiboPost = {
  id: string
  date: string
  createdAt: number
  author: WeiboAuthor
  text: string
  hotSearchId?: string
  likeCount: number
  liked: boolean
  comments: WeiboComment[]
  reactionStatus?: 'pending' | 'failed'
}

export type WeiboHotSearch = {
  id: string
  title: string
  heat: number
  tag: HotSearchTag
}

export type WeiboDay = {
  date: string
  hotSearches: WeiboHotSearch[]
}

export type WeiboState = {
  version: 1
  refreshedDates: string[]
  days: WeiboDay[]
  posts: WeiboPost[]
}

export type GeneratedHotSearch = {
  title: string
  heat: number
  tag: HotSearchTag
}

export type GeneratedWeiboPost = {
  authorKind: 'aoyin' | 'npc'
  authorName: string
  avatar: string
  bio: string
  text: string
  hotSearchIndex: number
}

export type GeneratedDailyWeibo = {
  hotSearches: GeneratedHotSearch[]
  posts: GeneratedWeiboPost[]
}

export type GeneratedPostReaction = {
  authorKind: 'aoyin' | 'npc'
  authorName: string
  avatar: string
  bio: string
  text: string
}

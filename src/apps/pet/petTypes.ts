export type PetLogActor = 'aoyin' | 'hunter' | 'bowan'

export type PetCareLog = {
  id: string
  actor: PetLogActor
  text: string
  createdAt: number
}

export type PetState = {
  version: 1
  hunger: number
  mood: number
  energy: number
  affection: number
  isSleeping: boolean
  reaction: string
  lastUpdatedAt: number
  lastAoyinCareAt: number
  lastPetAt: number
  logs: PetCareLog[]
}

export type FeedItemId = 'meatCan' | 'jerky' | 'water'
export type PlayItemId = 'ball' | 'tug'

export type PetAction =
  | { type: 'feed'; itemId: FeedItemId }
  | { type: 'pet' }
  | { type: 'play'; itemId: PlayItemId }
  | { type: 'toggleSleep' }

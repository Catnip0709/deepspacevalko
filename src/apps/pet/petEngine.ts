import type { FeedItemId, PetAction, PetCareLog, PetState, PlayItemId } from './petTypes'

const hourMs = 60 * 60 * 1000
const maxOfflineHours = 24
const maxLogs = 24
const petCooldownMs = 8 * 1000
const aoyinCareIntervalMs = 6 * hourMs

const feedEffects: Record<
  FeedItemId,
  { hunger: number; mood: number; energy: number; affection: number; reaction: string; log: string }
> = {
  meatCan: {
    hunger: 38,
    mood: 5,
    energy: 0,
    affection: 2,
    reaction: '罐头刚打开，它已经把脑袋埋进碗里了。',
    log: '给波万开了一罐肉，它吃得头也不抬。'
  },
  jerky: {
    hunger: 18,
    mood: 14,
    energy: 2,
    affection: 3,
    reaction: '尾巴扫得毯子沙沙响，还想再要一块。',
    log: '拿小肉干哄了波万，它终于肯把爪子松开。'
  },
  water: {
    hunger: 4,
    mood: 2,
    energy: 8,
    affection: 1,
    reaction: '喝完水，它认真舔了舔鼻尖。',
    log: '给波万换了干净的水。'
  }
}

const playEffects: Record<
  PlayItemId,
  { mood: number; energy: number; affection: number; reaction: string; log: string }
> = {
  ball: {
    mood: 22,
    energy: -16,
    affection: 4,
    reaction: '它冲出去又滚回来，球倒是忘在了半路。',
    log: '陪波万丢了一会儿球，它最后追的是自己的尾巴。'
  },
  tug: {
    mood: 18,
    energy: -12,
    affection: 5,
    reaction: '咬得很紧。看起来它打算连你一起拖走。',
    log: '和波万拔河，最后谁也没肯先松手。'
  }
}

const petReactions = [
  '耳朵抖了一下，脑袋却主动往你手心里拱。',
  '它翻过身露出肚皮，眼睛还在偷偷看你。',
  '尾巴重重拍了两下地面，像在催你继续。',
  '它把爪子搭在你手腕上，不准你先走。'
]

export function createInitialPetState(now = Date.now()): PetState {
  return {
    version: 1,
    hunger: 78,
    mood: 82,
    energy: 74,
    affection: 12,
    isSleeping: false,
    reaction: '波万闻到了熟悉的气味，慢吞吞地挪到你脚边。',
    lastUpdatedAt: now,
    lastAoyinCareAt: now,
    lastPetAt: 0,
    logs: [
      createLog('aoyin', '它刚到家。别被那副老实样骗了，罐头藏高一点。', now)
    ]
  }
}

export function settlePetState(state: PetState, now = Date.now()): PetState {
  if (now <= state.lastUpdatedAt) {
    return state
  }

  const elapsedHours = Math.min((now - state.lastUpdatedAt) / hourMs, maxOfflineHours)
  let hunger = clamp(state.hunger - elapsedHours * (state.isSleeping ? 1.2 : 2.4))
  let energy = clamp(state.energy + elapsedHours * (state.isSleeping ? 12 : -1.5))
  let mood = clamp(state.mood - (hunger < 30 ? elapsedHours * 1.4 : elapsedHours * 0.15))
  let lastAoyinCareAt = state.lastAoyinCareAt
  let logs = state.logs
  let reaction = state.isSleeping ? '波万蜷在毯子里，呼吸很轻。' : getIdleReaction(hunger, mood, energy)

  if (hunger < 25 && now - state.lastAoyinCareAt >= aoyinCareIntervalMs) {
    hunger = Math.max(hunger, 62)
    mood = clamp(mood + 6)
    lastAoyinCareAt = now
    reaction = '嘴边还沾着一点肉汁。看来有人先喂过它了。'
    logs = prependLog(logs, createLog('aoyin', '波万饿得守在柜子前，我喂过了。', now))
  }

  return {
    ...state,
    hunger,
    mood,
    energy,
    reaction,
    lastUpdatedAt: now,
    lastAoyinCareAt,
    logs
  }
}

export function performPetAction(state: PetState, action: PetAction, now = Date.now()): PetState {
  const current = settlePetState(state, now)

  if (action.type === 'toggleSleep') {
    const isSleeping = !current.isSleeping
    return {
      ...current,
      isSleeping,
      reaction: isSleeping ? '它在毯子上转了两圈，终于团成一团。' : '耳朵先醒了，随后才慢慢睁开眼。',
      lastUpdatedAt: now,
      logs: prependLog(
        current.logs,
        createLog('hunter', isSleeping ? '替波万把窝边的灯关掉了。' : '轻轻叫醒了波万。', now)
      )
    }
  }

  if (current.isSleeping) {
    return {
      ...current,
      reaction: '它睡得正熟，只把尾巴往怀里收了收。'
    }
  }

  if (action.type === 'feed') {
    const effect = feedEffects[action.itemId]
    return applyEffect(current, effect, now)
  }

  if (action.type === 'play') {
    if (current.energy < 15) {
      return {
        ...current,
        reaction: '它叼住玩具趴了下来，今天的电量不太够。'
      }
    }

    return applyEffect(current, playEffects[action.itemId], now)
  }

  if (now - current.lastPetAt < petCooldownMs) {
    return {
      ...current,
      reaction: '它用脑袋压住你的手，像是要慢慢摸。'
    }
  }

  const reaction = petReactions[Math.floor(now / 1000) % petReactions.length]
  return {
    ...current,
    mood: clamp(current.mood + 8),
    affection: clamp(current.affection + 3),
    reaction,
    lastPetAt: now,
    lastUpdatedAt: now,
    logs: prependLog(current.logs, createLog('hunter', '摸了摸波万，它很受用。', now))
  }
}

export function getAffectionStage(affection: number) {
  if (affection >= 70) {
    return '最喜欢你'
  }

  if (affection >= 25) {
    return '熟悉你了'
  }

  return '刚到家'
}

export function getPetStatus(state: PetState) {
  if (state.isSleeping) {
    return '睡得正香'
  }

  if (state.hunger < 25) {
    return '守着饭碗'
  }

  if (state.energy < 20) {
    return '有点困了'
  }

  if (state.mood > 85) {
    return '尾巴摇个不停'
  }

  return '窝里很舒服'
}

function applyEffect(
  state: PetState,
  effect: {
    hunger?: number
    mood: number
    energy: number
    affection: number
    reaction: string
    log: string
  },
  now: number
): PetState {
  return {
    ...state,
    hunger: clamp(state.hunger + (effect.hunger ?? 0)),
    mood: clamp(state.mood + effect.mood),
    energy: clamp(state.energy + effect.energy),
    affection: clamp(state.affection + effect.affection),
    reaction: effect.reaction,
    lastUpdatedAt: now,
    logs: prependLog(state.logs, createLog('hunter', effect.log, now))
  }
}

function getIdleReaction(hunger: number, mood: number, energy: number) {
  if (hunger < 25) {
    return '它把空碗往你这边推了推，动作十分熟练。'
  }

  if (energy < 20) {
    return '眼皮已经快合上了，尾巴还勉强搭在你脚边。'
  }

  if (mood < 30) {
    return '它背对着你趴下，只留一只耳朵听动静。'
  }

  return '它守在小窝里，看到你时轻轻甩了甩尾巴。'
}

function createLog(actor: PetCareLog['actor'], text: string, createdAt: number): PetCareLog {
  return {
    id: `pet-log-${createdAt}-${actor}`,
    actor,
    text,
    createdAt
  }
}

function prependLog(logs: PetCareLog[], log: PetCareLog) {
  return [log, ...logs].slice(0, maxLogs)
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

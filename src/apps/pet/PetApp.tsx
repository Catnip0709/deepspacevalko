import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  BookOpen,
  Heart,
  House,
  MoonStar,
  Sparkles,
  Sun,
  Utensils,
  X
} from 'lucide-react'
import { readStoredPetState, writeStoredPetState } from '../../storage/petStore'
import { CareLog } from './CareLog'
import { feedItems, playItems } from './petData'
import { performPetAction, settlePetState } from './petEngine'
import { PetScene } from './PetScene'
import type { FeedItemId, PetState, PlayItemId } from './petTypes'

type PetTab = 'home' | 'log'
type ActionMenu = 'feed' | 'play' | null

export function PetApp({ hunterName, onBackHome }: { hunterName: string; onBackHome: () => void }) {
  const [state, setState] = useState<PetState>(readStoredPetState)
  const [activeTab, setActiveTab] = useState<PetTab>('home')
  const [actionMenu, setActionMenu] = useState<ActionMenu>(null)

  useEffect(() => {
    writeStoredPetState(state)
  }, [state])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setState((current) => settlePetState(current))
    }, 60 * 1000)

    return () => window.clearInterval(timer)
  }, [])

  const act = (nextState: PetState) => {
    setState(nextState)
    setActionMenu(null)
  }

  const feed = (itemId: FeedItemId) => {
    act(performPetAction(state, { type: 'feed', itemId }))
  }

  const play = (itemId: PlayItemId) => {
    act(performPetAction(state, { type: 'play', itemId }))
  }

  return (
    <section className="pet-shell">
      <header className="pet-topbar">
        <button className="icon-button pet-back" type="button" onClick={onBackHome} aria-label="返回桌面">
          <ArrowLeft size={21} strokeWidth={2.4} />
        </button>
        <div>
          <strong>波万</strong>
          <span>和敖尹一起照顾</span>
        </div>
        <span className="pet-topbar-mark" aria-hidden="true">
          BW
        </span>
      </header>

      <div className="pet-content">
        <div className="pet-tabs" role="tablist" aria-label="波万页面">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'home'}
            className={activeTab === 'home' ? 'active' : ''}
            onClick={() => setActiveTab('home')}
          >
            <House size={16} strokeWidth={2.3} />
            小窝
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'log'}
            className={activeTab === 'log' ? 'active' : ''}
            onClick={() => setActiveTab('log')}
          >
            <BookOpen size={16} strokeWidth={2.3} />
            记录
          </button>
        </div>

        <div className="pet-view-port">
          {activeTab === 'home' ? (
            <PetScene state={state} onPet={() => act(performPetAction(state, { type: 'pet' }))} />
          ) : (
            <CareLog logs={state.logs} hunterName={hunterName} />
          )}
        </div>

        <nav className="pet-actions" aria-label="照顾波万">
          <button type="button" onClick={() => setActionMenu('feed')} disabled={state.isSleeping}>
            <Utensils size={21} strokeWidth={2.2} />
            <span>喂食</span>
          </button>
          <button
            type="button"
            onClick={() => act(performPetAction(state, { type: 'pet' }))}
            disabled={state.isSleeping}
          >
            <Heart size={21} strokeWidth={2.2} />
            <span>摸摸</span>
          </button>
          <button type="button" onClick={() => setActionMenu('play')} disabled={state.isSleeping}>
            <Sparkles size={21} strokeWidth={2.2} />
            <span>玩耍</span>
          </button>
          <button type="button" onClick={() => act(performPetAction(state, { type: 'toggleSleep' }))}>
            {state.isSleeping ? <Sun size={21} strokeWidth={2.2} /> : <MoonStar size={21} strokeWidth={2.2} />}
            <span>{state.isSleeping ? '叫醒' : '睡觉'}</span>
          </button>
        </nav>
      </div>

      {actionMenu ? (
        <div className="pet-sheet-layer" role="presentation">
          <button
            className="pet-sheet-backdrop"
            type="button"
            onClick={() => setActionMenu(null)}
            aria-label="关闭选择菜单"
          />
          <section className="pet-action-sheet" aria-label={actionMenu === 'feed' ? '选择食物' : '选择玩法'}>
            <header>
              <div>
                <span>{actionMenu === 'feed' ? '今天吃什么' : '陪它消耗精力'}</span>
                <h3>{actionMenu === 'feed' ? '给波万加餐' : '一起玩会儿'}</h3>
              </div>
              <button className="icon-button" type="button" onClick={() => setActionMenu(null)} aria-label="关闭">
                <X size={19} strokeWidth={2.3} />
              </button>
            </header>

            <div className="pet-sheet-options">
              {(actionMenu === 'feed' ? feedItems : playItems).map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() =>
                    actionMenu === 'feed' ? feed(item.id as FeedItemId) : play(item.id as PlayItemId)
                  }
                >
                  <strong>{item.name}</strong>
                  <span>{item.detail}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}

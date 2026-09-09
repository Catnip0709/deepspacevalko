import { BowanCharacter } from './BowanCharacter'
import { getAffectionStage, getPetStatus } from './petEngine'
import type { PetState } from './petTypes'

const stats = [
  { key: 'hunger', label: '饱腹', color: '#d99354' },
  { key: 'mood', label: '心情', color: '#e28c92' },
  { key: 'energy', label: '精力', color: '#6b9b70' },
  { key: 'affection', label: '亲密', color: '#bf6a61' }
] as const

export function PetScene({ state, onPet }: { state: PetState; onPet: () => void }) {
  return (
    <div className={`pet-home-view ${state.isSleeping ? 'sleeping' : ''}`}>
      <div className="pet-stage">
        <div className="pet-stage-heading">
          <div>
            <span>{getAffectionStage(state.affection)}</span>
            <h2>小狼波万</h2>
          </div>
          <strong>{getPetStatus(state)}</strong>
        </div>

        <button className="pet-avatar-button" type="button" onClick={onPet} aria-label="摸摸小狼波万">
          <BowanCharacter sleeping={state.isSleeping} />
        </button>

        <p className="pet-reaction" aria-live="polite">
          {state.reaction}
        </p>
      </div>

      <div className="pet-stats" aria-label="波万状态">
        {stats.map((stat) => {
          const value = state[stat.key]
          return (
            <div className="pet-stat" key={stat.key}>
              <div>
                <span>{stat.label}</span>
                <strong>{value}</strong>
              </div>
              <div className="pet-stat-track" aria-hidden="true">
                <span style={{ width: `${value}%`, background: stat.color }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

import { useState, type FormEvent } from 'react'
import { LockKeyhole, RotateCcw, Save } from 'lucide-react'
import type {
  AoyinPersonaSettings as AoyinPersonaDraft,
  HunterPersonaSettings as HunterPersonaDraft,
  PersonaSettings
} from '../../app/types'
import { defaultPersonaSettings, fixedAoyinProfile } from '../../config/aoyinPersona'

type PersonaPanelProps = {
  personaSettings: PersonaSettings
  onSave: (settings: PersonaSettings) => void
}

export function AoyinPersonaSettings({ personaSettings, onSave }: PersonaPanelProps) {
  const [draft, setDraft] = useState<AoyinPersonaDraft>({ ...personaSettings.aoyin })
  const [saved, setSaved] = useState(false)

  const updateDraft = (field: keyof AoyinPersonaDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }))
    setSaved(false)
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSave({
      ...personaSettings,
      aoyin: draft
    })
    setSaved(true)
  }

  const restoreDefaults = () => {
    if (!window.confirm('确认恢复敖尹的默认设定吗？')) {
      return
    }

    const defaults = { ...defaultPersonaSettings.aoyin }
    setDraft(defaults)
    onSave({
      ...personaSettings,
      aoyin: defaults
    })
    setSaved(true)
  }

  return (
    <div className="persona-settings">
      <section className="persona-fixed-panel" aria-label="敖尹固定设定">
        <div className="persona-section-title">
          <LockKeyhole size={17} strokeWidth={2.3} />
          <h3>固定设定</h3>
        </div>
        <dl>
          <div>
            <dt>姓名</dt>
            <dd>{fixedAoyinProfile.name}</dd>
          </div>
          <div>
            <dt>年龄</dt>
            <dd>{fixedAoyinProfile.age} 岁</dd>
          </div>
          <div>
            <dt>身份</dt>
            <dd>
              {fixedAoyinProfile.publicIdentity}
              <br />
              {fixedAoyinProfile.hiddenIdentity}
            </dd>
          </div>
          <div>
            <dt>能力</dt>
            <dd>{fixedAoyinProfile.evol} Evol</dd>
          </div>
        </dl>
      </section>

      <form className="settings-form persona-form" onSubmit={submit}>
        <label>
          <span>别名</span>
          <input
            value={draft.aliases}
            onChange={(event) => updateDraft('aliases', event.target.value)}
            maxLength={120}
            placeholder="用顿号分隔多个称呼"
          />
        </label>
        <label>
          <span>喜好</span>
          <input
            value={draft.likes}
            onChange={(event) => updateDraft('likes', event.target.value)}
            maxLength={120}
            placeholder="例如：巧克力、夜晚散步"
          />
        </label>
        <PersonaTextarea
          label="性格"
          value={draft.personality}
          placeholder="描述他的性格和处事方式"
          onChange={(value) => updateDraft('personality', value)}
        />
        <PersonaTextarea
          label="相处方式"
          value={draft.relationshipStyle}
          placeholder="描述他与你相处时的状态"
          onChange={(value) => updateDraft('relationshipStyle', value)}
        />
        <PersonaTextarea
          label="说话风格"
          value={draft.speakingStyle}
          placeholder="描述语气、句式和表达习惯"
          onChange={(value) => updateDraft('speakingStyle', value)}
        />
        <PersonaTextarea
          label="补充设定"
          value={draft.customNotes}
          placeholder="其他希望敖尹记住的设定"
          onChange={(value) => updateDraft('customNotes', value)}
        />
        <PersonaFormActions saved={saved} onRestore={restoreDefaults} />
      </form>
    </div>
  )
}

export function HunterPersonaSettings({ personaSettings, onSave }: PersonaPanelProps) {
  const [draft, setDraft] = useState<HunterPersonaDraft>({ ...personaSettings.hunter })
  const [saved, setSaved] = useState(false)

  const updateDraft = (field: keyof HunterPersonaDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }))
    setSaved(false)
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSave({
      ...personaSettings,
      hunter: draft
    })
    setSaved(true)
  }

  const restoreDefaults = () => {
    if (!window.confirm('确认恢复猎人小姐的默认设定吗？')) {
      return
    }

    const defaults = { ...defaultPersonaSettings.hunter }
    setDraft(defaults)
    onSave({
      ...personaSettings,
      hunter: defaults
    })
    setSaved(true)
  }

  return (
    <form className="settings-form persona-form persona-settings" onSubmit={submit}>
      <label>
        <span>名字</span>
        <input
          value={draft.name}
          onChange={(event) => updateDraft('name', event.target.value)}
          maxLength={120}
          placeholder="猎人小姐"
          required
        />
      </label>
      <label>
        <span>敖尹对你的称呼</span>
        <input
          value={draft.nicknameFromAoyin}
          onChange={(event) => updateDraft('nicknameFromAoyin', event.target.value)}
          maxLength={120}
          placeholder="小铃兰"
          required
        />
      </label>
      <PersonaTextarea
        label="身份"
        value={draft.identity}
        placeholder="描述你的职业、经历或身份"
        onChange={(value) => updateDraft('identity', value)}
      />
      <PersonaTextarea
        label="性格"
        value={draft.personality}
        placeholder="描述你的性格和行动方式"
        onChange={(value) => updateDraft('personality', value)}
      />
      <PersonaTextarea
        label="你们的关系"
        value={draft.relationship}
        placeholder="描述你与敖尹现在的关系"
        onChange={(value) => updateDraft('relationship', value)}
      />
      <PersonaTextarea
        label="补充设定"
        value={draft.customNotes}
        placeholder="其他希望敖尹记住的事情"
        onChange={(value) => updateDraft('customNotes', value)}
      />
      <PersonaFormActions saved={saved} onRestore={restoreDefaults} />
    </form>
  )
}

function PersonaTextarea({
  label,
  value,
  placeholder,
  onChange
}: {
  label: string
  value: string
  placeholder: string
  onChange: (value: string) => void
}) {
  return (
    <label>
      <span>{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={1200}
        placeholder={placeholder}
        rows={4}
      />
    </label>
  )
}

function PersonaFormActions({ saved, onRestore }: { saved: boolean; onRestore: () => void }) {
  return (
    <>
      <div className="persona-form-actions">
        <button className="secondary" type="button" onClick={onRestore}>
          <RotateCcw size={16} strokeWidth={2.3} />
          恢复默认
        </button>
        <button type="submit">
          <Save size={16} strokeWidth={2.3} />
          保存设定
        </button>
      </div>
      {saved ? <p className="settings-saved">设定已保存，下一次回复生效。</p> : null}
    </>
  )
}

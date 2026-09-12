import { useState, type FormEvent } from 'react'
import { Check, Trash2 } from 'lucide-react'
import { anniversaryNameLimit, dateLabel } from './calendarDates'

export function AnniversaryEditor({
  date, name, onSave, onDelete
}: {
  date: string
  name?: string
  onSave: (name: string) => boolean
  onDelete: () => boolean
}) {
  const [draft, setDraft] = useState(name ?? '')
  const [status, setStatus] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (draft.trim() && onSave(draft.trim())) {
      setDraft(draft.trim())
      setStatus('已保存')
    }
  }
  return (
    <form className="calendar-editor" onSubmit={submit} aria-label="编辑纪念日">
      <header>
        <h3>{dateLabel(date)}</h3>
        {name ? (
          <button type="button" className="icon-button danger" aria-label="删除纪念日" title="删除纪念日"
            onClick={() => {
              if (window.confirm(`确认删除“${name}”吗？`) && onDelete()) {
                setDraft('')
                setStatus('已删除')
              }
            }}>
            <Trash2 size={18} />
          </button>
        ) : null}
      </header>
      <label htmlFor="calendar-anniversary-name">纪念日名称</label>
      <input id="calendar-anniversary-name" value={draft} maxLength={anniversaryNameLimit}
        placeholder="给这一天起个名字" required
        onChange={(event) => { setDraft(event.target.value); setStatus('') }} />
      <footer>
        <span role="status">{status}</span>
        <button className="calendar-save" type="submit" disabled={!draft.trim()}>
          <Check size={17} /> 保存
        </button>
      </footer>
    </form>
  )
}

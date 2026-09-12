import { useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays, CalendarCheck, ChevronLeft, ChevronRight, Heart, Feather, Settings } from 'lucide-react'
import type { DeepSeekModel, PersonaSettings } from '../../app/types'
import { useCalendarEntries } from './useCalendarEntries'
import { AnniversaryEditor } from './AnniversaryEditor'
import {
  dateLabel, daysSince, firstCalendarDate, firstCalendarMonth, isCalendarMonth,
  localDateKey, monthCells, shiftMonth
} from './calendarDates'
import './calendar.css'

export function CalendarApp({ onBackHome, onOpenSettings, apiKey, model, persona }: {
  onBackHome: () => void
  onOpenSettings: () => void
  apiKey: string
  model: DeepSeekModel
  persona: PersonaSettings
}) {
  const { entries, error, noteStates, saveEntry, deleteEntry, generateNote } =
    useCalendarEntries({ apiKey, model, persona })
  const [today, setToday] = useState(localDateKey)
  const [tab, setTab] = useState<'calendar' | 'anniversaries'>('calendar')
  const [selected, setSelected] = useState(() => today < firstCalendarDate ? firstCalendarDate : today)
  const [month, setMonth] = useState(() => selected.slice(0, 7))

  useEffect(() => {
    const update = () => setToday(localDateKey())
    const timer = window.setInterval(update, 30000)
    window.addEventListener('focus', update)
    document.addEventListener('visibilitychange', update)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', update)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])

  const changeMonth = (next: string) => {
    if (!isCalendarMonth(next)) return
    setMonth(next)
    setSelected(`${next}-01`)
  }
  const openDate = (date: string) => {
    setSelected(date)
    setMonth(date.slice(0, 7))
    setTab('calendar')
  }
  const selectedEntry = entries.find((entry) => entry.date === selected)
  const byDate = new Map(entries.map((entry) => [entry.date, entry.name]))

  return (
    <section className="calendar-shell" aria-label="日历应用">
      <header className="calendar-topbar">
        <button type="button" className="icon-button" aria-label="返回桌面" onClick={onBackHome}>
          <ArrowLeft size={21} />
        </button>
        <h2>{tab === 'calendar' ? '日历' : '纪念日'}</h2>
        <button type="button" className="icon-button" title="回到今天" aria-label="回到今天"
          onClick={() => openDate(today < firstCalendarDate ? firstCalendarDate : today)}>
          <CalendarCheck size={21} />
        </button>
      </header>

      <div className="calendar-content">
        {error ? <p className="calendar-error" role="alert">{error}</p> : null}
        {tab === 'calendar' ? (
          <section aria-label="月历">
            <div className="calendar-month-navigation">
              <button type="button" className="icon-button" aria-label="上个月" title="上个月"
                disabled={month === firstCalendarMonth} onClick={() => changeMonth(shiftMonth(month, -1))}>
                <ChevronLeft size={20} />
              </button>
              <input type="month" aria-label="选择月份" value={month} min={firstCalendarMonth} max="9999-12"
                onChange={(event) => changeMonth(event.target.value)} />
              <button type="button" className="icon-button" aria-label="下个月" title="下个月"
                disabled={month === '9999-12'} onClick={() => changeMonth(shiftMonth(month, 1))}>
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="calendar-weekdays" aria-hidden="true">
              {['一', '二', '三', '四', '五', '六', '日'].map((day) => <span key={day}>{day}</span>)}
            </div>
            <div className="calendar-grid" aria-label={`${month}日期`}>
              {monthCells(month).map((date, index) => date ? (
                <button key={date} type="button"
                  className={`calendar-day${selected === date ? ' selected' : ''}${byDate.has(date) ? ' marked' : ''}`}
                  aria-label={`${dateLabel(date)}${byDate.has(date) ? `，${byDate.get(date)}` : ''}`}
                  aria-current={date === today ? 'date' : undefined}
                  aria-pressed={selected === date}
                  onClick={() => setSelected(date)}>
                  <span>{Number(date.slice(-2))}</span>
                  <i aria-hidden="true" />
                </button>
              ) : <span className="calendar-blank" key={`blank-${index}`} />)}
            </div>
            <AnniversaryEditor key={selected} date={selected} name={selectedEntry?.name}
              onSave={(name) => saveEntry(selected, name)}
              onDelete={() => deleteEntry(selected)} />
          </section>
        ) : (
          <section className="calendar-anniversaries" aria-label="纪念日列表">
            <p className="calendar-today">今天 · {dateLabel(today)}</p>
            {entries.length === 0 ? <p className="calendar-empty">还没有纪念日</p> : null}
            {[...entries].sort((a, b) => a.date.localeCompare(b.date)).map((entry) => {
              const days = daysSince(entry.date, today)
              return (
                <article key={entry.date} className={`calendar-anniversary${days < 0 ? ' future' : ''}`}>
                  <button className="calendar-anniversary-summary" type="button"
                    aria-label={`编辑${entry.name}，${dateLabel(entry.date)}`} onClick={() => openDate(entry.date)}>
                  <Heart size={20} aria-hidden="true" />
                  <span className="calendar-anniversary-info">
                    <strong>{entry.name}</strong><time dateTime={entry.date}>{dateLabel(entry.date)}</time>
                  </span>
                  <span className="calendar-day-count">
                    {days === 0 ? <b className="calendar-is-today">就是今天</b> : (
                      <><span>{days > 0 ? '已过' : '还有'}</span>
                        <b className={Math.abs(days) >= 100000 ? 'calendar-long-count' : undefined}>{Math.abs(days)}</b>
                        <span>天</span></>
                    )}
                  </span>
                  </button>
                  <div className="calendar-note">
                    {entry.aoyinNote ? <p><strong>敖尹：</strong>{entry.aoyinNote}</p> : (
                      <>
                        <p aria-live="polite">{noteStates[entry.date] === 'pending'
                          ? '敖尹正在写留言…' : noteStates[entry.date] || '敖尹还没有留言。'}</p>
                        {noteStates[entry.date] !== 'pending' ? (
                          <button type="button" className="calendar-note-action"
                            onClick={() => apiKey.trim() ? void generateNote(entry.date) : onOpenSettings()}>
                            {apiKey.trim() ? <Feather size={15} /> : <Settings size={15} />}
                            {apiKey.trim() ? '请敖尹留言' : '去设置填写 Key'}
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>

      <nav className="calendar-tabs" aria-label="日历底部标签">
        <button type="button" aria-pressed={tab === 'calendar'} onClick={() => setTab('calendar')}>
          <CalendarDays size={21} /> 日历
        </button>
        <button type="button" aria-pressed={tab === 'anniversaries'} onClick={() => setTab('anniversaries')}>
          <Heart size={21} /> 纪念日
        </button>
      </nav>
    </section>
  )
}

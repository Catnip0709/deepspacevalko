import { CalendarDays, MessageCircle, NotebookPen, PawPrint, Settings, Smartphone } from 'lucide-react'
import type { AppIcon } from '../app/types'
import { stickyNote } from './stickyNote'
import { WeatherWidget } from './WeatherWidget'

const apps: AppIcon[] = [
  {
    id: 'wechat',
    label: '微信',
    description: '与敖尹的置顶聊天',
    Icon: MessageCircle,
    accent: 'leaf'
  },
  {
    id: 'pet',
    label: '波万',
    description: '照顾小狼波万',
    Icon: PawPrint,
    accent: 'pet'
  },
  {
    id: 'calendar',
    label: '日历',
    description: '日历与纪念日',
    Icon: CalendarDays,
    accent: 'cream'
  },
  {
    id: 'his-phone',
    label: '他的手机',
    description: '敖尹视角待建设',
    Icon: Smartphone,
    accent: 'moss'
  },
  {
    id: 'note',
    label: '便签',
    description: '他留给你的话',
    Icon: NotebookPen,
    accent: 'cream'
  },
  {
    id: 'settings',
    label: '设置',
    description: 'DeepSeek API Key',
    Icon: Settings,
    accent: 'glass'
  }
]

export function Desktop({
  ownerName,
  openWechat,
  openPet,
  openCalendar,
  openSettings,
  openHisPhone,
  openNote
}: {
  ownerName: string
  openWechat: () => void
  openPet: () => void
  openCalendar: () => void
  openSettings: () => void
  openHisPhone: () => void
  openNote: () => void
}) {
  return (
    <>
      <section className="desktop-copy" aria-label="桌面标题">
        <p>Hunter&apos;s iPhone</p>
        <h1>{ownerName}</h1>
      </section>

      <WeatherWidget />

      <section className="icon-grid" aria-label="桌面应用">
        {apps.map(({ id, label, description, Icon, accent }) => (
          <button
            className="app-shortcut"
            type="button"
            key={id}
            aria-label={`${label}，${description}`}
            onClick={
              id === 'wechat'
                ? openWechat
                : id === 'pet'
                  ? openPet
                : id === 'calendar'
                  ? openCalendar
                : id === 'settings'
                  ? openSettings
                  : id === 'his-phone'
                    ? openHisPhone
                    : id === 'note'
                      ? openNote
                      : undefined
            }
          >
            <span className={`icon-glass ${accent}`}>
              <Icon size={27} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <span className="app-label">{label}</span>
          </button>
        ))}
      </section>

      <button className="sticky-widget" type="button" aria-label="展开敖尹写的便签" onClick={openNote}>
        <div className="widget-header">
          <span>{stickyNote.title}</span>
          <span>{stickyNote.author}</span>
        </div>
        <p>{stickyNote.preview}</p>
      </button>

      <footer className="dock" aria-label="桌面 Dock">
        <button type="button" aria-label="打开微信" onClick={openWechat}>
          <MessageCircle size={25} strokeWidth={2.3} />
        </button>
        <button type="button" aria-label="打开设置" onClick={openSettings}>
          <Settings size={25} strokeWidth={2.3} />
        </button>
      </footer>
    </>
  )
}

import { MessageCircle, NotebookPen, Settings, Smartphone } from 'lucide-react'
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
  openWechat,
  openSettings,
  openHisPhone,
  openNote
}: {
  openWechat: () => void
  openSettings: () => void
  openHisPhone: () => void
  openNote: () => void
}) {
  return (
    <>
      <section className="desktop-copy" aria-label="桌面标题">
        <p>Hunter&apos;s iPhone</p>
        <h1>猎人小姐</h1>
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

import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  Camera,
  ChevronRight,
  ExternalLink,
  KeyRound,
  LockKeyhole,
  MessageCircle,
  NotebookPen,
  Send,
  Settings,
  Smartphone,
  Trees,
  Trash2,
  Wifi
} from 'lucide-react'
import { aoyinPersona } from './config/aoyinPersona'
import { validateRedemptionCode } from './config/redemptionCodes'
import { streamDeepSeekCompletion, type DeepSeekChatMessage } from './harness/deepseekClient'
import './styles.css'

type Screen = 'desktop' | 'wechat' | 'settings' | 'hisPhone'
type WechatTab = 'chats' | 'moments'
type WechatView = 'list' | 'conversation'
type MomentAuthor = 'aoyin' | 'hunter'
type ChatRole = 'user' | 'assistant'

type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  createdAt: string
}

type MomentReply = {
  id: string
  author: MomentAuthor
  text: string
  pending?: boolean
}

type Moment = {
  id: string
  author: MomentAuthor
  authorName: string
  time: string
  text: string
  replies: MomentReply[]
}

type AppIcon = {
  id: Screen | 'his-phone' | 'note'
  label: string
  description: string
  Icon: typeof MessageCircle
  accent: string
}

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

const initialMoments: Moment[] = [
  {
    id: 'morning',
    author: 'aoyin',
    authorName: '敖尹',
    time: '08:12',
    text: '今早的雾很低，林间路不好走。小铃兰，回来时给我发个消息。',
    replies: []
  },
  {
    id: 'signal',
    author: 'aoyin',
    authorName: '敖尹',
    time: '13:47',
    text: '通讯器检修完了。下次别再说“还能用”，我听得出来你在逞强。',
    replies: []
  },
  {
    id: 'night',
    author: 'aoyin',
    authorName: '敖尹',
    time: '22:06',
    text: '夜巡结束。风从北面过来，有潮湿的树叶味。你会喜欢。',
    replies: []
  }
]

const apiKeyStorageKey = 'deepseekApiKey'
const modelStorageKey = 'selectedModel'
const chatStorageKey = 'chatMessages:aoyin'
const unlockStorageKey = 'valkophoneUnlocked:v1'
const unlockCodeHashStorageKey = 'valkophoneUnlockCodeHash:v1'
const deepSeekModels = ['deepseek-v4-flash', 'deepseek-v4-pro'] as const
type DeepSeekModel = (typeof deepSeekModels)[number]
const defaultModel: DeepSeekModel = 'deepseek-v4-flash'
const initialChatMessages: ChatMessage[] = [
  {
    id: 'welcome-aoyin',
    role: 'assistant',
    content: '出门前记得带好通讯器。还有，小铃兰，别总是一个人冲在最前面。',
    createdAt: '今天 16:21'
  }
]

const stickyNote = {
  title: '便签',
  author: '敖尹',
  preview: '出门前记得带好通讯器。还有，小铃兰，别总是一个人冲在最前面。',
  body: [
    '出门前记得带好通讯器。',
    '巧克力我也放了一块，别又说自己不饿。',
    '补给包我放在门口左边，里面有止血贴、能量胶，还有一小瓶热饮。',
    '如果遇到异常波动，先发坐标，不要一个人追。',
    '我不是不相信你的判断。只是有些风向，我比你更早闻到。',
    '小铃兰，平安回来。'
  ]
}

function getCurrentTime() {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date())
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function readLocalStorage(key: string, fallback = '') {
  try {
    return window.localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function readStoredBoolean(key: string) {
  return readLocalStorage(key) === 'true'
}

function normalizeDeepSeekModel(model: string): DeepSeekModel {
  return deepSeekModels.includes(model as DeepSeekModel) ? (model as DeepSeekModel) : defaultModel
}

function readStoredChatMessages() {
  try {
    const raw = window.localStorage.getItem(chatStorageKey)
    return raw ? (JSON.parse(raw) as ChatMessage[]) : initialChatMessages
  } catch {
    return initialChatMessages
  }
}

function maskApiKey(apiKey: string) {
  if (!apiKey) {
    return ''
  }

  if (apiKey.length <= 8) {
    return '已保存'
  }

  return `${apiKey.slice(0, 3)}****${apiKey.slice(-4)}`
}

function buildDeepSeekMessages(chatMessages: ChatMessage[]): DeepSeekChatMessage[] {
  const recentMessages = chatMessages.slice(-12).map((message) => ({
    role: message.role,
    content: message.content
  }))

  return [
    {
      role: 'system',
      content: aoyinPersona.systemPrompt
    },
    ...recentMessages
  ]
}

function buildMomentReplyMessages({
  sourceAuthor,
  sourceText,
  hunterComment
}: {
  sourceAuthor: MomentAuthor
  sourceText: string
  hunterComment?: string
}): DeepSeekChatMessage[] {
  const scene =
    sourceAuthor === 'hunter'
      ? `猎人小姐刚刚发了一条朋友圈：“${sourceText}”。`
      : `敖尹之前发了一条朋友圈：“${sourceText}”。猎人小姐评论：“${hunterComment ?? ''}”。`

  return [
    {
      role: 'system',
      content: [
        aoyinPersona.systemPrompt,
        '当前场景是微信朋友圈评论区，不是私聊。',
        '请只生成敖尹对猎人小姐的一条朋友圈回复。',
        '回复要根据她发的内容或评论内容自然回应，不要泛泛而谈。',
        '长度控制在 8 到 36 个中文字符之间，像真实朋友圈评论。',
        '不要加引号，不要写“敖尹：”，不要解释。'
      ].join('\n')
    },
    {
      role: 'user',
      content: scene
    }
  ]
}

function App() {
  const [screen, setScreen] = useState<Screen>('desktop')
  const [wechatTab, setWechatTab] = useState<WechatTab>('chats')
  const [wechatView, setWechatView] = useState<WechatView>('list')
  const [moments, setMoments] = useState<Moment[]>(initialMoments)
  const [isNoteOpen, setIsNoteOpen] = useState(false)
  const [apiKey, setApiKey] = useState(() => readLocalStorage(apiKeyStorageKey))
  const [isUnlocked, setIsUnlocked] = useState(() => readStoredBoolean(unlockStorageKey))
  const [selectedModel, setSelectedModel] = useState<DeepSeekModel>(() =>
    normalizeDeepSeekModel(readLocalStorage(modelStorageKey, defaultModel))
  )
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(readStoredChatMessages)
  const [isChatting, setIsChatting] = useState(false)
  const [chatError, setChatError] = useState('')
  const [momentError, setMomentError] = useState('')
  const [replyingMomentIds, setReplyingMomentIds] = useState<string[]>([])

  useEffect(() => {
    window.localStorage.setItem(chatStorageKey, JSON.stringify(chatMessages))
  }, [chatMessages])

  const saveApiKey = (nextApiKey: string, nextModel: string) => {
    const trimmedApiKey = nextApiKey.trim()
    const trimmedModel = normalizeDeepSeekModel(nextModel.trim())

    setApiKey(trimmedApiKey)
    setSelectedModel(trimmedModel)
    window.localStorage.setItem(apiKeyStorageKey, trimmedApiKey)
    window.localStorage.setItem(modelStorageKey, trimmedModel)
  }

  const redeemCode = async (code: string) => {
    const result = await validateRedemptionCode(code)

    if (!result) {
      return false
    }

    setIsUnlocked(true)
    window.localStorage.setItem(unlockStorageKey, 'true')
    window.localStorage.setItem(unlockCodeHashStorageKey, result.codeHash)

    return true
  }

  const sendChatMessage = async (text: string) => {
    const trimmed = text.trim()

    if (!trimmed || isChatting) {
      return
    }

    if (!apiKey) {
      setChatError('请先到设置里填写 DeepSeek API Key。')
      setScreen('settings')
      return
    }

    const userMessage: ChatMessage = {
      id: createId('user-message'),
      role: 'user',
      content: trimmed,
      createdAt: getCurrentTime()
    }
    const assistantMessage: ChatMessage = {
      id: createId('assistant-message'),
      role: 'assistant',
      content: '',
      createdAt: getCurrentTime()
    }
    const nextMessages = [...chatMessages, userMessage, assistantMessage]

    setChatMessages(nextMessages)
    setChatError('')
    setIsChatting(true)

    try {
      const messages = buildDeepSeekMessages([...chatMessages, userMessage])

      await streamDeepSeekCompletion({
        apiKey,
        model: selectedModel,
        messages,
        onDelta: (delta) => {
          setChatMessages((current) =>
            current.map((message) =>
              message.id === assistantMessage.id ? { ...message, content: message.content + delta } : message
            )
          )
        }
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'DeepSeek 请求失败，请稍后再试。'
      setChatError(message)
      setChatMessages((current) =>
        current.map((item) =>
          item.id === assistantMessage.id ? { ...item, content: `消息没有发出去：${message}` } : item
        )
      )
    } finally {
      setIsChatting(false)
    }
  }

  const clearChatMessages = () => {
    setChatMessages(initialChatMessages)
    setChatError('')
  }

  const generateMomentReply = async ({
    momentId,
    replyId,
    sourceAuthor,
    sourceText,
    hunterComment
  }: {
    momentId: string
    replyId: string
    sourceAuthor: MomentAuthor
    sourceText: string
    hunterComment?: string
  }) => {
    if (!apiKey) {
      setMomentError('请先到设置里填写 DeepSeek API Key，敖尹才能回复朋友圈。')
      setScreen('settings')
      return
    }

    setMomentError('')
    setReplyingMomentIds((current) => [...current, momentId])

    try {
      let receivedText = ''

      await streamDeepSeekCompletion({
        apiKey,
        model: selectedModel,
        messages: buildMomentReplyMessages({
          sourceAuthor,
          sourceText,
          hunterComment
        }),
        onDelta: (delta) => {
          receivedText += delta
          setMoments((current) =>
            current.map((moment) =>
              moment.id === momentId
                ? {
                    ...moment,
                    replies: moment.replies.map((reply) =>
                      reply.id === replyId ? { ...reply, text: receivedText, pending: true } : reply
                    )
                  }
                : moment
            )
          )
        }
      })

      setMoments((current) =>
        current.map((moment) =>
          moment.id === momentId
            ? {
                ...moment,
                replies: moment.replies.map((reply) =>
                  reply.id === replyId
                    ? {
                        ...reply,
                        text: receivedText.trim() || '我看到了，小铃兰。',
                        pending: false
                      }
                    : reply
                )
              }
            : moment
        )
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'DeepSeek 请求失败，请稍后再试。'
      setMomentError(message)
      setMoments((current) =>
        current.map((moment) =>
          moment.id === momentId
            ? {
                ...moment,
                replies: moment.replies.map((reply) =>
                  reply.id === replyId
                    ? {
                        ...reply,
                        text: `回复没有生成：${message}`,
                        pending: false
                      }
                    : reply
                )
              }
            : moment
        )
      )
    } finally {
      setReplyingMomentIds((current) => current.filter((id) => id !== momentId))
    }
  }

  const publishMoment = async (text: string) => {
    const momentId = createId('hunter-moment')
    const replyId = createId('aoyin-reply')
    const newMoment: Moment = {
      id: momentId,
      author: 'hunter',
      authorName: '猎人小姐',
      time: getCurrentTime(),
      text,
      replies: [
        {
          id: replyId,
          author: 'aoyin',
          text: apiKey ? '敖尹正在回复...' : '需要先填写 DeepSeek API Key。',
          pending: Boolean(apiKey)
        }
      ]
    }

    setMoments((current) => [newMoment, ...current])

    await generateMomentReply({
      momentId,
      replyId,
      sourceAuthor: 'hunter',
      sourceText: text
    })
  }

  const replyToMoment = async (momentId: string, text: string) => {
    const targetMoment = moments.find((moment) => moment.id === momentId)

    if (!targetMoment) {
      return
    }

    const replyId = createId('aoyin-reply')

    setMoments((current) =>
      current.map((moment) =>
        moment.id === momentId
          ? {
              ...moment,
              replies: [
                ...moment.replies,
                {
                  id: createId('hunter-reply'),
                  author: 'hunter',
                  text
                },
                {
                  id: replyId,
                  author: 'aoyin',
                  text: apiKey ? '敖尹正在回复...' : '需要先填写 DeepSeek API Key。',
                  pending: Boolean(apiKey)
                }
              ]
            }
          : moment
      )
    )

    await generateMomentReply({
      momentId,
      replyId,
      sourceAuthor: targetMoment.author,
      sourceText: targetMoment.text,
      hunterComment: text
    })
  }

  const openWechat = () => {
    if (!isUnlocked) {
      setScreen('settings')
      return
    }

    setScreen('wechat')
    setWechatTab('chats')
    setWechatView('list')
  }

  const returnHome = () => {
    setScreen('desktop')
    setWechatView('list')
  }

  const openSettings = () => {
    setScreen('settings')
    setWechatView('list')
  }

  const openHisPhone = () => {
    if (!isUnlocked) {
      setScreen('settings')
      setWechatView('list')
      return
    }

    setScreen('hisPhone')
    setWechatView('list')
  }

  return (
    <main className="page-shell" aria-label="猎人小姐手机桌面">
      <section className="phone-frame" aria-label="iPhone 风手机界面">
        <div className="phone-hardware">
          <div className="phone-screen">
            <div className="wallpaper-layer" />
            <div className="screen-vignette" />

            <header className="status-bar" aria-label="状态栏">
              <time>{getCurrentTime()}</time>
              <div className="status-icons" aria-hidden="true">
                <Wifi size={15} strokeWidth={2.3} />
                <span className="signal-bars">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="battery">
                  <span />
                </span>
              </div>
            </header>

            {screen === 'desktop' ? (
              <Desktop
                openWechat={openWechat}
                openSettings={openSettings}
                openHisPhone={openHisPhone}
                openNote={() => setIsNoteOpen(true)}
              />
            ) : null}

            {screen === 'wechat' ? (
              <WechatApp
                activeTab={wechatTab}
                view={wechatView}
                moments={moments}
                chatMessages={chatMessages}
                isChatting={isChatting}
                chatError={chatError}
                hasApiKey={Boolean(apiKey)}
                onBackHome={returnHome}
                onOpenConversation={() => setWechatView('conversation')}
                onBackToList={() => setWechatView('list')}
                onChangeTab={(tab) => {
                  setWechatTab(tab)
                  setWechatView('list')
                }}
                onPublishMoment={publishMoment}
                onReplyToMoment={replyToMoment}
                momentError={momentError}
                replyingMomentIds={replyingMomentIds}
                onSendChatMessage={sendChatMessage}
                onClearChat={clearChatMessages}
                onOpenSettings={openSettings}
              />
            ) : null}

            {screen === 'settings' ? (
              <SettingsApp
                apiKey={apiKey}
                isUnlocked={isUnlocked}
                selectedModel={selectedModel}
                onBackHome={returnHome}
                onSave={saveApiKey}
                onRedeem={redeemCode}
              />
            ) : null}

            {screen === 'hisPhone' ? <HisPhoneApp onBackHome={returnHome} /> : null}

            {isNoteOpen ? <StickyNoteModal onClose={() => setIsNoteOpen(false)} /> : null}
          </div>
        </div>
      </section>
    </main>
  )
}

function Desktop({
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

function HisPhoneApp({ onBackHome }: { onBackHome: () => void }) {
  return (
    <section className="his-phone-shell" aria-label="他的手机">
      <header className="app-topbar">
        <button className="icon-button" type="button" aria-label="返回桌面" onClick={onBackHome}>
          <ArrowLeft size={21} strokeWidth={2.4} />
        </button>
        <h2>他的手机</h2>
        <span />
      </header>

      <div className="under-construction">
        <div className="locked-phone-card">
          <span className="aoyin-avatar large">🐺</span>
          <Smartphone size={38} strokeWidth={1.9} />
          <h3>敖尹的手机视角</h3>
          <p>待建设。这里会保留为后续扩展入口，之后可以做他的桌面、他的微信、他的记录。</p>
        </div>
      </div>
    </section>
  )
}

function WechatApp({
  activeTab,
  view,
  moments,
  chatMessages,
  isChatting,
  chatError,
  hasApiKey,
  onBackHome,
  onOpenConversation,
  onBackToList,
  onChangeTab,
  onPublishMoment,
  onReplyToMoment,
  momentError,
  replyingMomentIds,
  onSendChatMessage,
  onClearChat,
  onOpenSettings
}: {
  activeTab: WechatTab
  view: WechatView
  moments: Moment[]
  chatMessages: ChatMessage[]
  isChatting: boolean
  chatError: string
  hasApiKey: boolean
  onBackHome: () => void
  onOpenConversation: () => void
  onBackToList: () => void
  onChangeTab: (tab: WechatTab) => void
  onPublishMoment: (text: string) => Promise<void>
  onReplyToMoment: (momentId: string, text: string) => Promise<void>
  momentError: string
  replyingMomentIds: string[]
  onSendChatMessage: (text: string) => void
  onClearChat: () => void
  onOpenSettings: () => void
}) {
  const title = activeTab === 'chats' ? (view === 'conversation' ? '敖尹' : '微信') : '朋友圈'

  return (
    <section className="wechat-shell" aria-label="微信">
      <header className="app-topbar">
        <button
          className="icon-button"
          type="button"
          aria-label={view === 'conversation' ? '返回聊天列表' : '返回桌面'}
          onClick={view === 'conversation' ? onBackToList : onBackHome}
        >
          <ArrowLeft size={21} strokeWidth={2.4} />
        </button>
        <h2>{title}</h2>
        <button className="icon-button ghost" type="button" aria-label="微信通知">
          <Bell size={19} strokeWidth={2.3} />
        </button>
      </header>

      <div className="wechat-content">
        {activeTab === 'chats' && view === 'list' ? <ChatList onOpenConversation={onOpenConversation} /> : null}
        {activeTab === 'chats' && view === 'conversation' ? (
          <ConversationShell
            messages={chatMessages}
            isChatting={isChatting}
            error={chatError}
            hasApiKey={hasApiKey}
            onSend={onSendChatMessage}
            onClear={onClearChat}
            onOpenSettings={onOpenSettings}
          />
        ) : null}
        {activeTab === 'moments' ? (
          <MomentsFeed
            moments={moments}
            momentError={momentError}
            replyingMomentIds={replyingMomentIds}
            onPublishMoment={onPublishMoment}
            onReplyToMoment={onReplyToMoment}
          />
        ) : null}
      </div>

      <nav className="wechat-tabs" aria-label="微信底部标签">
        <button
          className={activeTab === 'chats' ? 'active' : ''}
          type="button"
          aria-pressed={activeTab === 'chats'}
          onClick={() => onChangeTab('chats')}
        >
          <MessageCircle size={21} strokeWidth={2.3} />
          <span>聊天</span>
        </button>
        <button
          className={activeTab === 'moments' ? 'active' : ''}
          type="button"
          aria-pressed={activeTab === 'moments'}
          onClick={() => onChangeTab('moments')}
        >
          <Camera size={21} strokeWidth={2.3} />
          <span>朋友圈</span>
        </button>
      </nav>
    </section>
  )
}

function ChatList({ onOpenConversation }: { onOpenConversation: () => void }) {
  return (
    <section className="chat-list" aria-label="聊天列表">
      <button className="contact-row" type="button" onClick={onOpenConversation} aria-label="打开与敖尹的聊天">
        <AoyinAvatar />
        <span className="contact-main">
          <span className="contact-title">敖尹</span>
          <span className="contact-preview">别总是一个人冲在最前面。</span>
        </span>
        <span className="contact-meta">
          <span>刚刚</span>
          <ChevronRight size={18} strokeWidth={2.3} />
        </span>
      </button>
    </section>
  )
}

function ConversationShell({
  messages,
  isChatting,
  error,
  hasApiKey,
  onSend,
  onClear,
  onOpenSettings
}: {
  messages: ChatMessage[]
  isChatting: boolean
  error: string
  hasApiKey: boolean
  onSend: (text: string) => void
  onClear: () => void
  onOpenSettings: () => void
}) {
  const [draft, setDraft] = useState('')

  const submitMessage = (event: { preventDefault: () => void }) => {
    event.preventDefault()
    const text = draft.trim()

    if (!text || isChatting) {
      return
    }

    onSend(text)
    setDraft('')
  }

  return (
    <section className="conversation-shell" aria-label="与敖尹的聊天">
      <div className="conversation-actions">
        <span>{hasApiKey ? 'DeepSeek 已连接' : '需要填写 DeepSeek API Key'}</span>
        <button type="button" onClick={onClear} aria-label="清空与敖尹的聊天记录">
          <Trash2 size={15} strokeWidth={2.4} />
          清空
        </button>
      </div>

      <div className="messages-scroll" aria-live="polite">
        {messages.map((message) => (
          <div className={`message-row ${message.role === 'assistant' ? 'other' : 'mine'}`} key={message.id}>
            {message.role === 'assistant' ? <AoyinAvatar /> : null}
            <p>{message.content || '...'}</p>
          </div>
        ))}
      </div>

      {!hasApiKey ? (
        <div className="chat-warning">
          <span>先在设置里填写 DeepSeek API Key，才能继续聊天。</span>
          <button type="button" onClick={onOpenSettings}>
            去设置
          </button>
        </div>
      ) : null}

      {error ? <p className="chat-error">{error}</p> : null}

      <form className="chat-input-bar" onSubmit={submitMessage} aria-label="发送消息">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={hasApiKey ? '和敖尹说点什么...' : '请先去设置填写 API Key'}
          disabled={!hasApiKey || isChatting}
        />
        <button type="submit" disabled={!hasApiKey || !draft.trim() || isChatting} aria-label="发送消息">
          <Send size={18} strokeWidth={2.4} />
        </button>
      </form>
    </section>
  )
}

function MomentsFeed({
  moments,
  momentError,
  replyingMomentIds,
  onPublishMoment,
  onReplyToMoment
}: {
  moments: Moment[]
  momentError: string
  replyingMomentIds: string[]
  onPublishMoment: (text: string) => Promise<void>
  onReplyToMoment: (momentId: string, text: string) => Promise<void>
}) {
  const [draft, setDraft] = useState('')
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})

  const submitMoment = async (event: { preventDefault: () => void }) => {
    event.preventDefault()
    const text = draft.trim()

    if (!text) {
      return
    }

    void onPublishMoment(text)
    setDraft('')
  }

  const submitReply = async (event: { preventDefault: () => void }, momentId: string) => {
    event.preventDefault()
    const text = replyDrafts[momentId]?.trim()

    if (!text) {
      return
    }

    void onReplyToMoment(momentId, text)
    setReplyDrafts((current) => ({ ...current, [momentId]: '' }))
  }

  return (
    <section className="moments-feed" aria-label="朋友圈列表">
      <form className="moment-composer" onSubmit={submitMoment} aria-label="发布朋友圈">
        <HunterAvatar />
        <div className="moment-composer-body">
          <label>
            <span>
              <Trees size={17} strokeWidth={2.2} />
              猎人小姐发朋友圈
            </span>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="写点什么给朋友圈..."
              rows={3}
            />
          </label>
          <button type="submit" disabled={!draft.trim()}>
            发布
          </button>
        </div>
      </form>
      {momentError ? <p className="moment-error">{momentError}</p> : null}
      {moments.map((item) => (
        <article className="moment-card" key={item.id}>
          {item.author === 'aoyin' ? <AoyinAvatar /> : <HunterAvatar />}
          <div className="moment-body">
            <div className="moment-title">
              <span>{item.authorName}</span>
              <time>{item.time}</time>
            </div>
            <p>{item.text}</p>
            {item.replies.length > 0 ? (
              <div className="moment-replies" aria-label={`${item.authorName}朋友圈回复`}>
                {item.replies.map((reply) => (
                  <div className={`moment-reply ${reply.pending ? 'pending' : ''}`} key={reply.id}>
                    {reply.author === 'aoyin' ? <AoyinMiniAvatar /> : <HunterMiniAvatar />}
                    <p>
                      <strong>{reply.author === 'aoyin' ? '敖尹' : '猎人小姐'}：</strong>
                      {reply.text}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
            <form className="moment-reply-form" onSubmit={(event) => submitReply(event, item.id)}>
              <input
                value={replyDrafts[item.id] ?? ''}
                onChange={(event) =>
                  setReplyDrafts((current) => ({
                    ...current,
                    [item.id]: event.target.value
                  }))
                }
                placeholder={item.author === 'aoyin' ? '回复敖尹...' : '补充一句...'}
                aria-label={`回复${item.authorName}的朋友圈`}
                disabled={replyingMomentIds.includes(item.id)}
              />
              <button type="submit" disabled={!replyDrafts[item.id]?.trim() || replyingMomentIds.includes(item.id)}>
                {replyingMomentIds.includes(item.id) ? '等待' : '回复'}
              </button>
            </form>
          </div>
        </article>
      ))}
    </section>
  )
}

function SettingsApp({
  apiKey,
  isUnlocked,
  selectedModel,
  onBackHome,
  onSave,
  onRedeem
}: {
  apiKey: string
  isUnlocked: boolean
  selectedModel: string
  onBackHome: () => void
  onSave: (apiKey: string, model: string) => void
  onRedeem: (code: string) => Promise<boolean>
}) {
  const [draftCode, setDraftCode] = useState('')
  const [redeemState, setRedeemState] = useState<'idle' | 'checking' | 'success' | 'error'>('idle')
  const [draftApiKey, setDraftApiKey] = useState(apiKey)
  const [draftModel, setDraftModel] = useState<DeepSeekModel>(normalizeDeepSeekModel(selectedModel || defaultModel))
  const [saved, setSaved] = useState(false)
  const maskedKey = maskApiKey(apiKey)

  const submitRedemptionCode = async (event: { preventDefault: () => void }) => {
    event.preventDefault()

    if (!draftCode.trim() || redeemState === 'checking' || isUnlocked) {
      return
    }

    setRedeemState('checking')
    const accepted = await onRedeem(draftCode)

    if (accepted) {
      setDraftCode('')
      setRedeemState('success')
      return
    }

    setRedeemState('error')
  }

  const submitSettings = (event: { preventDefault: () => void }) => {
    event.preventDefault()
    onSave(draftApiKey, draftModel)
    setSaved(true)
  }

  return (
    <section className="settings-shell" aria-label="设置">
      <header className="app-topbar">
        <button className="icon-button" type="button" aria-label="返回桌面" onClick={onBackHome}>
          <ArrowLeft size={21} strokeWidth={2.4} />
        </button>
        <h2>设置</h2>
        <span />
      </header>

      <div className="settings-content">
        <section className="settings-card unlock-card">
          <div className="settings-icon">
            {isUnlocked ? <BadgeCheck size={25} strokeWidth={2.3} /> : <LockKeyhole size={25} strokeWidth={2.3} />}
          </div>
          <div>
            <h3>买断解锁</h3>
            <p>{isUnlocked ? '已解锁。微信和他的手机都可以正常使用。' : '拿到兑换码后在这里输入，解锁会保存在当前浏览器。'}</p>
          </div>
        </section>

        <form className="settings-form unlock-form" onSubmit={submitRedemptionCode}>
          <div className="settings-status-row">
            <span>解锁状态</span>
            <strong className={`settings-status-tag ${isUnlocked ? 'connected' : 'empty'}`}>
              {isUnlocked ? '已买断' : '未解锁'}
            </strong>
          </div>

          <label>
            <span>兑换码</span>
            <input
              value={draftCode}
              onChange={(event) => {
                setDraftCode(event.target.value)
                setRedeemState('idle')
              }}
              placeholder="VALKO-XXXX-XXXX"
              autoComplete="off"
              spellCheck={false}
              disabled={isUnlocked}
              aria-label="买断兑换码"
            />
          </label>

          <button type="submit" disabled={isUnlocked || !draftCode.trim() || redeemState === 'checking'}>
            {isUnlocked ? '已解锁' : redeemState === 'checking' ? '校验中...' : '解锁手机'}
          </button>
          {redeemState === 'success' ? <p className="settings-saved">兑换成功，已保存到当前浏览器。</p> : null}
          {redeemState === 'error' ? <p className="settings-error">兑换码不对，检查一下有没有漏字母或空格。</p> : null}
        </form>

        <section className="settings-card">
          <div className="settings-icon">
            <KeyRound size={25} strokeWidth={2.3} />
          </div>
          <div>
            <h3>DeepSeek API Key</h3>
            <p>这里用你自己的 DeepSeek 账号聊天。Key 只存在这个浏览器里，不会上传到我们自己的服务器。</p>
          </div>
        </section>

        <section className="settings-guide" aria-label="DeepSeek API Key 获取步骤">
          <h3>怎么准备 Key</h3>
          <ol>
            <li>
              打开{' '}
              <a href="https://platform.deepseek.com/" target="_blank" rel="noreferrer">
                DeepSeek 开放平台
                <ExternalLink size={13} strokeWidth={2.4} />
              </a>
              ，注册或登录账号。
            </li>
            <li>
              进入{' '}
              <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer">
                API Keys
                <ExternalLink size={13} strokeWidth={2.4} />
              </a>
              ，创建一个新 Key，复制 `sk-` 开头的完整内容。
            </li>
            <li>
              如果余额不足，去{' '}
              <a href="https://platform.deepseek.com/top_up" target="_blank" rel="noreferrer">
                充值
                <ExternalLink size={13} strokeWidth={2.4} />
              </a>
              。官方说明支持支付宝/微信在线充值，费用按 token 从余额里扣。
            </li>
          </ol>
          <p>
            费用参考：
            <a href="https://api-docs.deepseek.com/zh-cn/quick_start/pricing" target="_blank" rel="noreferrer">
              官方模型与价格
              <ExternalLink size={13} strokeWidth={2.4} />
            </a>
          </p>
        </section>

        <form className="settings-form" onSubmit={submitSettings}>
          <div className="settings-status-row">
            <span>当前状态</span>
            <strong className={`settings-status-tag ${apiKey ? 'connected' : 'empty'}`}>
              {apiKey ? `已保存 ${maskedKey}` : '未填写'}
            </strong>
          </div>

          <label>
            <span>{apiKey ? '修改 API Key' : '填写 API Key'}</span>
            <input
              value={draftApiKey}
              onChange={(event) => {
                setDraftApiKey(event.target.value)
                setSaved(false)
              }}
              placeholder="sk-..."
              autoComplete="off"
              spellCheck={false}
              aria-label="DeepSeek API Key"
            />
          </label>

          <fieldset className="model-picker">
            <legend>模型</legend>
            {deepSeekModels.map((model) => (
              <label className={draftModel === model ? 'selected' : ''} key={model}>
                <input
                  type="radio"
                  name="deepseek-model"
                  value={model}
                  checked={draftModel === model}
                  onChange={(event) => {
                    setDraftModel(event.target.value as DeepSeekModel)
                    setSaved(false)
                  }}
                />
                <span>{model === 'deepseek-v4-flash' ? 'V4 Flash' : 'V4 Pro'}</span>
                <small>{model === 'deepseek-v4-flash' ? '推荐，便宜且够用' : '更强，费用更高'}</small>
              </label>
            ))}
          </fieldset>

          <button type="submit">{apiKey ? '保存修改' : '保存 API Key'}</button>
          {saved ? <p className="settings-saved">已保存到当前浏览器。</p> : null}
        </form>
      </div>
    </section>
  )
}

function StickyNoteModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="note-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="note-modal" role="dialog" aria-modal="true" aria-label="敖尹写的完整便签" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <p>{stickyNote.title}</p>
            <h2>{stickyNote.author}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="关闭便签" onClick={onClose}>
            <ArrowLeft size={20} strokeWidth={2.4} />
          </button>
        </header>
        <div className="note-paper">
          {stickyNote.body.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </section>
    </div>
  )
}

function AoyinAvatar() {
  return (
    <span className="aoyin-avatar" aria-hidden="true">
      🐺
    </span>
  )
}

function HunterAvatar() {
  return (
    <span className="hunter-avatar" aria-hidden="true">
      猎
    </span>
  )
}

function AoyinMiniAvatar() {
  return (
    <span className="mini-avatar aoyin-mini-avatar" aria-hidden="true">
      🐺
    </span>
  )
}

function HunterMiniAvatar() {
  return (
    <span className="mini-avatar hunter-mini-avatar" aria-hidden="true">
      猎
    </span>
  )
}

createRoot(document.getElementById('root')!).render(<App />)

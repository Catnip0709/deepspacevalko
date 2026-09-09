import { useEffect, useState } from 'react'
import { PhoneFrame } from '../components/PhoneFrame'
import { Desktop } from '../desktop/Desktop'
import { StickyNoteModal } from '../desktop/StickyNoteModal'
import { HisPhoneApp } from '../apps/his-phone/HisPhoneApp'
import { SettingsApp } from '../apps/settings/SettingsApp'
import { initialChatMessages } from '../apps/wechat/chatData'
import { initialMoments } from '../apps/wechat/momentsData'
import { WechatApp } from '../apps/wechat/WechatApp'
import { maskRedemptionCode } from './masking'
import {
  apiKeyStorageKey,
  modelStorageKey,
  unlockCodeHashStorageKey,
  unlockCodeLabelStorageKey,
  unlockCodeStorageKey,
  unlockStorageKey
} from './storageKeys'
import { createId, getCurrentTime } from './time'
import type { ChatMessage, DeepSeekModel, Moment, MomentAuthor, Screen, WechatTab } from './types'
import { validateRedemptionCode } from '../config/redemptionCodes'
import { normalizeDeepSeekModel } from '../config/deepseekModels'
import { requestAoyinChatReply, streamAoyinMomentReply } from '../harness/chatHarness'
import { aoyinReplyToMessagePatch } from '../harness/wechatTools'
import { readStoredChatMessages, writeStoredChatMessages } from '../storage/chatStore'
import { readLocalStorage, readStoredBoolean, writeLocalStorage } from '../storage/localStorage'

export function App() {
  const [screen, setScreen] = useState<Screen>('desktop')
  const [wechatTab, setWechatTab] = useState<WechatTab>('chats')
  const [moments, setMoments] = useState<Moment[]>(initialMoments)
  const [isNoteOpen, setIsNoteOpen] = useState(false)
  const [apiKey, setApiKey] = useState(() => readLocalStorage(apiKeyStorageKey))
  const [isUnlocked, setIsUnlocked] = useState(() => readStoredBoolean(unlockStorageKey))
  const [selectedModel, setSelectedModel] = useState<DeepSeekModel>(() =>
    normalizeDeepSeekModel(readLocalStorage(modelStorageKey))
  )
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(readStoredChatMessages)
  const [isChatting, setIsChatting] = useState(false)
  const [chatError, setChatError] = useState('')
  const [momentError, setMomentError] = useState('')
  const [replyingMomentIds, setReplyingMomentIds] = useState<string[]>([])

  useEffect(() => {
    writeStoredChatMessages(chatMessages)
  }, [chatMessages])

  const saveApiKey = (nextApiKey: string, nextModel: string) => {
    const trimmedApiKey = nextApiKey.trim()
    const trimmedModel = normalizeDeepSeekModel(nextModel.trim())

    setApiKey(trimmedApiKey)
    setSelectedModel(trimmedModel)
    writeLocalStorage(apiKeyStorageKey, trimmedApiKey)
    writeLocalStorage(modelStorageKey, trimmedModel)
  }

  const redeemCode = async (code: string) => {
    const result = await validateRedemptionCode(code)

    if (!result) {
      return false
    }

    setIsUnlocked(true)
    writeLocalStorage(unlockStorageKey, 'true')
    writeLocalStorage(unlockCodeStorageKey, result.normalizedCode)
    writeLocalStorage(unlockCodeHashStorageKey, result.codeHash)
    writeLocalStorage(unlockCodeLabelStorageKey, maskRedemptionCode(result.normalizedCode))

    return true
  }

  const sendChatTurn = async (userMessage: ChatMessage) => {
    if (!apiKey) {
      setChatError('请先到设置里填写 DeepSeek API Key。')
      setScreen('settings')
      return
    }

    const assistantMessage: ChatMessage = {
      id: createId('assistant-message'),
      role: 'assistant',
      type: 'text',
      content: '',
      createdAt: getCurrentTime()
    }
    const nextMessages = [...chatMessages, userMessage, assistantMessage]

    setChatMessages(nextMessages)
    setChatError('')
    setIsChatting(true)

    try {
      const reply = await requestAoyinChatReply({
        apiKey,
        model: selectedModel,
        chatMessages: [...chatMessages, userMessage]
      })
      const messagePatch = aoyinReplyToMessagePatch(reply)

      setChatMessages((current) =>
        current.map((message) => (message.id === assistantMessage.id ? { ...message, ...messagePatch } : message))
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'DeepSeek 请求失败，请稍后再试。'
      setChatError(message)
      setChatMessages((current) => current.filter((item) => item.id !== assistantMessage.id))
    } finally {
      setIsChatting(false)
    }
  }

  const sendChatMessage = async (text: string) => {
    const trimmed = text.trim()

    if (!trimmed || isChatting) {
      return
    }

    await sendChatTurn({
      id: createId('user-message'),
      role: 'user',
      type: 'text',
      content: trimmed,
      createdAt: getCurrentTime()
    })
  }

  const sendLocationMessage = async (place: string, note?: string) => {
    const trimmed = place.trim()
    const trimmedNote = note?.trim()

    if (!trimmed || isChatting) {
      return
    }

    await sendChatTurn({
      id: createId('user-location'),
      role: 'user',
      type: 'location',
      content: trimmedNote ? `我把定位发给你：${trimmed}。留言：${trimmedNote}` : `我把定位发给你：${trimmed}`,
      createdAt: getCurrentTime(),
      location: {
        place: trimmed,
        note: trimmedNote || undefined
      }
    })
  }

  const sendRedPacketMessage = async (amount: string, note?: string) => {
    const trimmed = amount.trim()
    const trimmedNote = note?.trim()

    if (!trimmed || isChatting) {
      return
    }

    await sendChatTurn({
      id: createId('user-red-packet'),
      role: 'user',
      type: 'redPacket',
      content: trimmedNote ? `给你发了一个 ${trimmed} 元红包。留言：${trimmedNote}` : `给你发了一个 ${trimmed} 元红包。`,
      createdAt: getCurrentTime(),
      redPacket: {
        amount: trimmed,
        note: trimmedNote || '给敖尹的红包'
      }
    })
  }

  const regenerateAssistantMessage = async (
    messagesForPrompt: ChatMessage[],
    assistantMessageId: string,
    previousMessage?: ChatMessage
  ) => {
    if (!apiKey) {
      setChatError('请先到设置里填写 DeepSeek API Key。')
      setScreen('settings')
      return
    }

    setChatError('')
    setIsChatting(true)

    try {
      const reply = await requestAoyinChatReply({
        apiKey,
        model: selectedModel,
        chatMessages: messagesForPrompt
      })
      const messagePatch = aoyinReplyToMessagePatch(reply)

      setChatMessages((current) =>
        current.map((message) => (message.id === assistantMessageId ? { ...message, ...messagePatch } : message))
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'DeepSeek 请求失败，请稍后再试。'
      setChatError(message)
      setChatMessages((current) =>
        previousMessage
          ? current.map((item) => (item.id === assistantMessageId ? previousMessage : item))
          : current.filter((item) => item.id !== assistantMessageId)
      )
    } finally {
      setIsChatting(false)
    }
  }

  const editLastUserMessage = (messageId: string, text: string) => {
    if (!apiKey) {
      setChatError('请先到设置里填写 DeepSeek API Key。')
      setScreen('settings')
      return
    }

    const trimmed = text.trim()

    if (!trimmed) {
      return
    }

    const userIndex = chatMessages.findIndex((message) => message.id === messageId && message.role === 'user')

    if (userIndex < 0 || isChatting) {
      return
    }

    const lastUserIndex = findLastMessageIndex(chatMessages, 'user')

    if (userIndex !== lastUserIndex) {
      return
    }

    const updatedUserMessage: ChatMessage = {
      ...chatMessages[userIndex],
      content: trimmed,
      createdAt: getCurrentTime()
    }
    const messagesBeforeAssistant = [...chatMessages.slice(0, userIndex), updatedUserMessage]
    const assistantMessage: ChatMessage = {
      id: createId('assistant-message'),
      role: 'assistant',
      content: '',
      createdAt: getCurrentTime()
    }

    setChatMessages([...messagesBeforeAssistant, assistantMessage])
    void regenerateAssistantMessage(messagesBeforeAssistant, assistantMessage.id)
  }

  const regenerateLastAssistantMessage = (messageId: string) => {
    if (!apiKey) {
      setChatError('请先到设置里填写 DeepSeek API Key。')
      setScreen('settings')
      return
    }

    const assistantIndex = chatMessages.findIndex((message) => message.id === messageId && message.role === 'assistant')

    if (assistantIndex < 0 || isChatting) {
      return
    }

    const lastAssistantIndex = findLastMessageIndex(chatMessages, 'assistant')

    if (assistantIndex !== lastAssistantIndex) {
      return
    }

    const messagesForPrompt = chatMessages.slice(0, assistantIndex)
    const hasUserMessage = messagesForPrompt.some((message) => message.role === 'user')

    if (!hasUserMessage) {
      return
    }

    setChatMessages((current) =>
      current.map((message) =>
        message.id === messageId
          ? {
              ...message,
              type: 'text',
              content: '',
              location: undefined,
              redPacket: undefined
            }
          : message
      )
    )
    void regenerateAssistantMessage(messagesForPrompt, messageId, chatMessages[assistantIndex])
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

      await streamAoyinMomentReply({
        apiKey,
        model: selectedModel,
        sourceAuthor,
        sourceText,
        hunterComment,
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
  }

  const returnHome = () => {
    setScreen('desktop')
  }

  const openSettings = () => {
    setScreen('settings')
  }

  const openHisPhone = () => {
    if (!isUnlocked) {
      setScreen('settings')
      return
    }

    setScreen('hisPhone')
  }

  return (
    <PhoneFrame>
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
          moments={moments}
          chatMessages={chatMessages}
          isChatting={isChatting}
          chatError={chatError}
          hasApiKey={Boolean(apiKey)}
          onBackHome={returnHome}
          onChangeTab={setWechatTab}
          onPublishMoment={publishMoment}
          onReplyToMoment={replyToMoment}
          momentError={momentError}
          replyingMomentIds={replyingMomentIds}
          onSendChatMessage={sendChatMessage}
          onSendLocationMessage={sendLocationMessage}
          onSendRedPacketMessage={sendRedPacketMessage}
          onEditLastUserMessage={editLastUserMessage}
          onRegenerateLastAssistantMessage={regenerateLastAssistantMessage}
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
    </PhoneFrame>
  )
}

function findLastMessageIndex(messages: ChatMessage[], role: ChatMessage['role']) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === role) {
      return index
    }
  }

  return -1
}

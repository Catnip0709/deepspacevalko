import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type { ChatMessage, DeepSeekModel, Moment, PersonaSettings } from '../../app/types'
import { createId, getCurrentTime } from '../../app/time'
import { requestAoyinMomentPost } from '../../harness/momentPostHarness'

export function useMomentPost({
  apiKey, model, chatMessages, moments, persona, setMoments, onOpenSettings
}: {
  apiKey: string
  model: DeepSeekModel
  chatMessages: ChatMessage[]
  moments: Moment[]
  persona: PersonaSettings
  setMoments: Dispatch<SetStateAction<Moment[]>>
  onOpenSettings: () => void
}) {
  const [isPosting, setIsPosting] = useState(false)
  const [postError, setPostError] = useState('')
  const activeRequest = useRef<AbortController | null>(null)

  useEffect(() => () => {
    activeRequest.current?.abort()
    activeRequest.current = null
  }, [])

  const publishAoyinMoment = async () => {
    if (activeRequest.current) return
    if (!apiKey.trim()) {
      setPostError('请先到设置里填写 DeepSeek API Key。')
      onOpenSettings()
      return
    }
    const controller = new AbortController()
    activeRequest.current = controller
    setIsPosting(true)
    setPostError('')
    const timeout = window.setTimeout(() => controller.abort(), 90000)
    try {
      const text = await requestAoyinMomentPost({
        apiKey, model, chatMessages, moments, persona, signal: controller.signal
      })
      if (activeRequest.current !== controller || controller.signal.aborted) return
      const moment: Moment = {
        id: createId('aoyin-moment'), author: 'aoyin', authorName: '敖尹',
        text, time: getCurrentTime(), createdAt: Date.now(), replies: []
      }
      setMoments((current) => [moment, ...current])
    } catch {
      if (activeRequest.current === controller) {
        setPostError(controller.signal.aborted
          ? '等得有些久了，敖尹这次没发出朋友圈，请再试一次。'
          : '敖尹这次没发出朋友圈，请检查网络和 API Key 后再试。')
      }
    } finally {
      window.clearTimeout(timeout)
      if (activeRequest.current === controller) {
        activeRequest.current = null
        setIsPosting(false)
      }
    }
  }

  return { isPosting, postError, publishAoyinMoment }
}

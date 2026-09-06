import { useState, type FormEvent } from 'react'
import { ArrowLeft, BadgeCheck, ChevronRight, ExternalLink, KeyRound, LockKeyhole } from 'lucide-react'
import { unlockCodeLabelStorageKey, unlockCodeStorageKey } from '../../app/storageKeys'
import type { DeepSeekModel, SettingsView } from '../../app/types'
import { maskApiKey, maskRedemptionCode } from '../../app/masking'
import { deepSeekModels, defaultModel, normalizeDeepSeekModel } from '../../config/deepseekModels'
import { readLocalStorage } from '../../storage/localStorage'

export function SettingsApp({
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
  const [settingsView, setSettingsView] = useState<SettingsView>('list')
  const [draftCode, setDraftCode] = useState(() => readLocalStorage(unlockCodeStorageKey))
  const [redeemState, setRedeemState] = useState<'idle' | 'checking' | 'success' | 'error'>('idle')
  const [draftApiKey, setDraftApiKey] = useState(apiKey)
  const [draftModel, setDraftModel] = useState<DeepSeekModel>(normalizeDeepSeekModel(selectedModel || defaultModel))
  const [saved, setSaved] = useState(false)
  const maskedKey = maskApiKey(apiKey)
  const unlockCodeLabel = readLocalStorage(
    unlockCodeLabelStorageKey,
    isUnlocked && draftCode ? maskRedemptionCode(draftCode) : ''
  )
  const title = settingsView === 'list' ? '设置' : settingsView === 'unlock' ? '手机解锁' : 'DeepSeek API Key'
  const goBack = settingsView === 'list' ? onBackHome : () => setSettingsView('list')

  const submitRedemptionCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!draftCode.trim() || redeemState === 'checking' || isUnlocked) {
      return
    }

    setRedeemState('checking')
    const accepted = await onRedeem(draftCode)

    if (accepted) {
      setDraftCode(readLocalStorage(unlockCodeStorageKey, draftCode.trim()))
      setRedeemState('success')
      return
    }

    setRedeemState('error')
  }

  const submitSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSave(draftApiKey, draftModel)
    setSaved(true)
  }

  return (
    <section className="settings-shell" aria-label="设置">
      <header className="app-topbar">
        <button
          className="icon-button"
          type="button"
          aria-label={settingsView === 'list' ? '返回桌面' : '返回设置'}
          onClick={goBack}
        >
          <ArrowLeft size={21} strokeWidth={2.4} />
        </button>
        <h2>{title}</h2>
        <span />
      </header>

      <div className="settings-content">
        {settingsView === 'list' ? (
          <section className="settings-list" aria-label="设置列表">
            <button className="settings-list-row" type="button" onClick={() => setSettingsView('unlock')}>
              <span className="settings-icon">
                {isUnlocked ? <BadgeCheck size={25} strokeWidth={2.3} /> : <LockKeyhole size={25} strokeWidth={2.3} />}
              </span>
              <span className="settings-list-main">
                <strong>手机解锁</strong>
                <small>{isUnlocked ? `已解锁${unlockCodeLabel ? ` ${unlockCodeLabel}` : ''}` : '输入买断兑换码'}</small>
              </span>
              <ChevronRight size={19} strokeWidth={2.4} />
            </button>

            <button className="settings-list-row" type="button" onClick={() => setSettingsView('deepseek')}>
              <span className="settings-icon">
                <KeyRound size={25} strokeWidth={2.3} />
              </span>
              <span className="settings-list-main">
                <strong>DeepSeek API Key</strong>
                <small>{apiKey ? `已保存 ${maskedKey}` : '填写自己的 API Key'}</small>
              </span>
              <ChevronRight size={19} strokeWidth={2.4} />
            </button>
          </section>
        ) : null}

        {settingsView === 'unlock' ? (
          <>
            <section className="settings-card unlock-card">
              <div className="settings-icon">
                {isUnlocked ? <BadgeCheck size={25} strokeWidth={2.3} /> : <LockKeyhole size={25} strokeWidth={2.3} />}
              </div>
              <div>
                <h3>买断解锁</h3>
                <p>{isUnlocked ? '这台手机已经解锁，微信和他的手机都可以正常使用。' : '拿到兑换码后在这里输入，解锁会保存在当前浏览器。'}</p>
              </div>
            </section>

            <form className="settings-form unlock-form" onSubmit={submitRedemptionCode}>
              <div className="settings-status-row">
                <span>解锁状态</span>
                <strong className={`settings-status-tag ${isUnlocked ? 'connected' : 'empty'}`}>
                  {isUnlocked ? `已买断${unlockCodeLabel ? ` ${unlockCodeLabel}` : ''}` : '未解锁'}
                </strong>
              </div>

              <label>
                <span>{isUnlocked ? '已填写兑换码' : '兑换码'}</span>
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
          </>
        ) : null}

        {settingsView === 'deepseek' ? (
          <>
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
          </>
        ) : null}
      </div>
    </section>
  )
}

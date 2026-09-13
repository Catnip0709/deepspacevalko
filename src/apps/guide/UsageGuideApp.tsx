import { ArrowLeft, ExternalLink, KeyRound, LockKeyhole, Settings, Smartphone } from 'lucide-react'
import './guide.css'

export function UsageGuideApp({
  onBackHome,
  onOpenSettings
}: {
  onBackHome: () => void
  onOpenSettings: () => void
}) {
  return (
    <section className="guide-shell" aria-label="使用说明应用">
      <header className="app-topbar">
        <button className="icon-button" type="button" aria-label="返回桌面" onClick={onBackHome}>
          <ArrowLeft size={21} strokeWidth={2.4} />
        </button>
        <h2>使用说明</h2>
        <span />
      </header>

      <div className="guide-content">
        <section className="guide-intro">
          <span aria-hidden="true"><Smartphone size={25} /></span>
          <div>
            <small>Hunter&apos;s iPhone</small>
            <h3>这是一台属于猎人小姐的小手机</h3>
            <p>微信、朋友圈、微博、日历和波万都保存在当前浏览器。更换浏览器或清理网站数据后，需要重新填写配置。</p>
          </div>
        </section>

        <section className="guide-steps" aria-label="开始使用">
          <h3>开始之前</h3>
          <ol>
            <li>
              <span className="guide-step-icon"><LockKeyhole size={19} /></span>
              <div>
                <strong>购买并填写激活码</strong>
                <p>从发布者提供的购买渠道获取激活码，再进入“设置 → 手机解锁”填写。解锁后可进入微信和他的手机。</p>
              </div>
            </li>
            <li>
              <span className="guide-step-icon"><KeyRound size={19} /></span>
              <div>
                <strong>准备 DeepSeek API Key</strong>
                <p>
                  前往
                  <a href="https://platform.deepseek.com/" target="_blank" rel="noreferrer">
                    DeepSeek 开放平台 <ExternalLink size={12} />
                  </a>
                  注册账号，并在
                  <a href="https://platform.deepseek.com/top_up" target="_blank" rel="noreferrer">
                    充值页面 <ExternalLink size={12} />
                  </a>
                  充值余额。
                </p>
              </div>
            </li>
            <li>
              <span className="guide-step-icon"><Settings size={19} /></span>
              <div>
                <strong>创建 Key 并在设置中保存</strong>
                <p>
                  打开
                  <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer">
                    API Keys <ExternalLink size={12} />
                  </a>
                  创建并复制完整 Key，然后进入“设置 → DeepSeek API Key”填写。
                </p>
              </div>
            </li>
          </ol>
        </section>

        <aside className="guide-note">
          <strong>激活码与 API Key 是两项独立配置</strong>
          <p>激活码用于解锁小手机内容；DeepSeek 余额用于支付聊天、评论和内容生成产生的模型费用。</p>
        </aside>

        <button className="guide-settings" type="button" onClick={onOpenSettings}>
          <Settings size={17} />
          打开设置
        </button>
      </div>
    </section>
  )
}

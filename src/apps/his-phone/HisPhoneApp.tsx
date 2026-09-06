import { ArrowLeft, Smartphone } from 'lucide-react'

export function HisPhoneApp({ onBackHome }: { onBackHome: () => void }) {
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

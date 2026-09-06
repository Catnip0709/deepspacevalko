import type { ReactNode } from 'react'
import { StatusBar } from './StatusBar'

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <main className="page-shell" aria-label="猎人小姐手机桌面">
      <section className="phone-frame" aria-label="iPhone 风手机界面">
        <div className="phone-hardware">
          <div className="phone-screen">
            <div className="wallpaper-layer" />
            <div className="screen-vignette" />
            <StatusBar />
            {children}
          </div>
        </div>
      </section>
    </main>
  )
}

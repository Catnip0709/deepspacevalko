import { ArrowLeft } from 'lucide-react'
import { stickyNote } from './stickyNote'

export function StickyNoteModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="note-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="note-modal"
        role="dialog"
        aria-modal="true"
        aria-label="敖尹写的完整便签"
        onClick={(event) => event.stopPropagation()}
      >
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

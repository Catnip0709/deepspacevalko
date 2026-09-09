import { Gift, MapPin, Navigation } from 'lucide-react'
import type { ChatMessage } from '../../app/types'

export function MessageContent({ message }: { message: ChatMessage }) {
  if (message.type === 'location' && message.location) {
    return (
      <>
        {message.role === 'assistant' && message.content ? <p>{message.content}</p> : null}
        <LocationMessageCard place={message.location.place} note={message.location.note} />
      </>
    )
  }

  if (message.type === 'redPacket' && message.redPacket) {
    return (
      <>
        {message.role === 'assistant' && message.content ? <p>{message.content}</p> : null}
        <RedPacketMessageCard amount={message.redPacket.amount} note={message.redPacket.note} />
      </>
    )
  }

  return <p>{message.content || '...'}</p>
}

function LocationMessageCard({ place, note }: { place: string; note?: string }) {
  return (
    <article className="chat-location-card" aria-label={`定位：${place}`}>
      <div className="mini-map" aria-hidden="true">
        <span className="map-road main" />
        <span className="map-road branch" />
        <span className="map-water" />
        <span className="map-pin">
          <MapPin size={16} strokeWidth={2.6} />
        </span>
      </div>
      <div className="message-card-body">
        <strong>{place}</strong>
        <span>
          <Navigation size={13} strokeWidth={2.4} />
          共享定位
        </span>
        {note ? <em>{note}</em> : null}
      </div>
    </article>
  )
}

function RedPacketMessageCard({ amount, note }: { amount: string; note?: string }) {
  return (
    <article className="chat-red-packet-card" aria-label={`红包：${amount}元`}>
      <span className="red-packet-seal">
        <Gift size={19} strokeWidth={2.4} />
      </span>
      <div className="message-card-body">
        <strong>{amount} 元</strong>
        <span>{note || '给敖尹的红包'}</span>
      </div>
    </article>
  )
}

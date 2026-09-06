import { useState } from 'react'
import { CloudFog, CloudRain, CloudSun, Wind } from 'lucide-react'
import type { WeatherIconId } from '../app/types'
import { weatherScenes } from './weatherData'

const weatherIcons = {
  fog: CloudFog,
  sun: CloudSun,
  rain: CloudRain,
  wind: Wind
} satisfies Record<WeatherIconId, typeof CloudFog>

export function WeatherWidget() {
  const currentHour = new Date().getHours()
  const sceneIndex = currentHour < 11 ? 0 : currentHour < 17 ? 1 : currentHour < 21 ? 2 : 3
  const scene = weatherScenes[sceneIndex]
  const [reminderIndex, setReminderIndex] = useState(0)
  const reminder = scene.reminders[reminderIndex % scene.reminders.length]
  const WeatherIcon = weatherIcons[scene.icon]

  return (
    <button
      className="weather-widget"
      type="button"
      aria-label={`临空市天气，${scene.condition}，${scene.temperature}`}
      onClick={() => setReminderIndex((current) => current + 1)}
    >
      <span className="weather-glow" aria-hidden="true" />
      <span className="weather-main">
        <span className="weather-place">
          <span>临空市</span>
          <small>{scene.period}</small>
        </span>
        <span className="weather-temp">{scene.temperature}</span>
      </span>
      <span className="weather-side">
        <WeatherIcon size={33} strokeWidth={1.9} />
        <strong>{scene.condition}</strong>
        <small>{scene.detail}</small>
      </span>
      <span className="weather-note">{reminder}</span>
    </button>
  )
}

import type { WeatherScene } from '../app/types'

export const weatherScenes: WeatherScene[] = [
  {
    id: 'morning',
    period: '清晨',
    temperature: '16°',
    condition: '林间薄雾',
    detail: '空气湿润，适合慢一点回家。',
    reminders: ['oi：小铃兰，外套带上。', 'oi：雾还没散，别走近没有信号的林道。'],
    icon: 'fog'
  },
  {
    id: 'afternoon',
    period: '午后',
    temperature: '22°',
    condition: '晴间云影',
    detail: '光线很好，风从南面过来。',
    reminders: ['oi：补给包在门口，巧克力也在。别空着手出门。', 'oi：阳光不错，任务结束后陪我走一段。'],
    icon: 'sun'
  },
  {
    id: 'evening',
    period: '傍晚',
    temperature: '18°',
    condition: '细雨将至',
    detail: '云层压低，路面会有潮气。',
    reminders: ['oi：我来接你。别说不用，我已经在路上。', 'oi：通讯器开着，小铃兰，让我听见你的动静。'],
    icon: 'rain'
  },
  {
    id: 'night',
    period: '夜间',
    temperature: '13°',
    condition: '夜风偏凉',
    detail: '森林边缘风速升高。',
    reminders: ['oi：注意安全。你回来晚了我也会一直等。', 'oi：风声不对，靠近光亮的路走。'],
    icon: 'wind'
  }
]

import type { DeepSeekModel } from '../app/types'

export const deepSeekModels = ['deepseek-v4-flash', 'deepseek-v4-pro'] as const satisfies readonly DeepSeekModel[]

export const defaultModel: DeepSeekModel = 'deepseek-v4-flash'

export function normalizeDeepSeekModel(model: string): DeepSeekModel {
  return deepSeekModels.includes(model as DeepSeekModel) ? (model as DeepSeekModel) : defaultModel
}

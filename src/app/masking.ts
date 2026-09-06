export function maskApiKey(apiKey: string) {
  if (!apiKey) {
    return ''
  }

  if (apiKey.length <= 8) {
    return '已保存'
  }

  return `${apiKey.slice(0, 3)}****${apiKey.slice(-4)}`
}

export function maskRedemptionCode(code: string) {
  if (!code) {
    return ''
  }

  return `${code.slice(0, 5)}-****-${code.slice(-4)}`
}

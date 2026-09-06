export function readLocalStorage(key: string, fallback = '') {
  try {
    return window.localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

export function writeLocalStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Browser privacy modes can reject writes. Keep runtime usable.
  }
}

export function readStoredBoolean(key: string) {
  return readLocalStorage(key) === 'true'
}

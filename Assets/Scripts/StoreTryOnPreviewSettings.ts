const PREVIEW_PROXY_KEY = 'StoreTryOn.previewProxy.v1'
const CACHE_WRITE_ERROR = 'Could not save live preview access. Existing shopping-list data was not changed. Free some Lens storage and try again.'

interface PreviewProxySettings {
  baseUrl: string
  accessToken: string
}

function normalizeOrigin(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '')
}

/** Origin only: no user information, path, query, fragment, or backslash. */
function isHttpsOrigin(baseUrl: string): boolean {
  const match = /^https:\/\/([^\/:?#@\s\\]+)(?::([0-9]{1,5}))?$/.exec(baseUrl)
  if (!match || match[1].length > 253) return false
  if (match[2] && (Number(match[2]) < 1 || Number(match[2]) > 65535)) return false
  return match[1].split('.').every(label =>
    /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label))
}

function persistSettings(store: GeneralDataStore, settings: PreviewProxySettings): void {
  const json = JSON.stringify(settings)
  let previous = ''
  let hadPrevious = false
  let writeAttempted = false
  let full = false
  const previousOnFull = store.onStoreFull
  try {
    previous = store.getString(PREVIEW_PROXY_KEY)
    hadPrevious = store.has(PREVIEW_PROXY_KEY)
    if (previous === json) return
    // Installing a callback makes getSizeInBytes report the actual shared-store usage.
    store.onStoreFull = () => {
      full = true
      if (typeof previousOnFull === 'function') previousOnFull()
    }
    const used = store.getSizeInBytes()
    const maximum = store.getMaxSizeInBytes()
    const additionalBytes = Math.max(0, json.length - previous.length) * 2 + 128
    if (maximum > 0 && used + additionalBytes > maximum) throw new Error(CACHE_WRITE_ERROR)
    writeAttempted = true
    store.putString(PREVIEW_PROXY_KEY, json)
    if (full || store.getString(PREVIEW_PROXY_KEY) !== json) throw new Error(CACHE_WRITE_ERROR)
  } catch (_) {
    if (writeAttempted) {
      try {
        if (hadPrevious) store.putString(PREVIEW_PROXY_KEY, previous)
        else store.remove(PREVIEW_PROXY_KEY)
      } catch (_) { /* Do not touch another store key when restoring this cache fails. */ }
    }
    throw new Error(CACHE_WRITE_ERROR)
  } finally {
    store.onStoreFull = previousOnFull
  }
}

/**
 * Editor-only cache of the separate, revocable demo proxy token; never a provider API key.
 * The cache survives preview resets without placing a credential in the authored scene.
 * PersistentStorage is readable by Lens code: this is prototype access, not secure user identity.
 */
export function resolvePreviewProxySettings(baseUrl: string, accessToken: string, isEditor: boolean): PreviewProxySettings {
  if (!isEditor) return {baseUrl, accessToken}
  const origin = normalizeOrigin(baseUrl)
  const token = accessToken.trim()
  if (!isHttpsOrigin(origin)) return {baseUrl: origin, accessToken: ''}
  const store = global.persistentStorageSystem.store
  if (token) {
    const settings = {baseUrl: origin, accessToken: token}
    persistSettings(store, settings)
    return settings
  }
  try {
    const cached = JSON.parse(store.getString(PREVIEW_PROXY_KEY))
    if (!cached || typeof cached !== 'object' || Array.isArray(cached) ||
        Object.keys(cached).some(key => key !== 'baseUrl' && key !== 'accessToken') ||
        cached.baseUrl !== origin || typeof cached.accessToken !== 'string' || !cached.accessToken.trim()) {
      return {baseUrl: origin, accessToken: ''}
    }
    return {baseUrl: origin, accessToken: cached.accessToken.trim()}
  } catch (_) {
    return {baseUrl: origin, accessToken: ''}
  }
}

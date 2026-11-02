import {StoredShoppingItem} from './StoreTryOnState'

const STORAGE_KEY = 'StoreTryOn.shoppingList.v1'

/** Single JSON write makes each add atomic. Never evicts an existing item. */
export class StoreTryOnStorage {
  private store = global.persistentStorageSystem.store
  private full = false

  constructor() {
    this.store.onStoreFull = () => { this.full = true }
  }

  read(): StoredShoppingItem[] {
    const data = this.store.getString(STORAGE_KEY)
    if (!data) return []
    const parsed = JSON.parse(data)
    if (!Array.isArray(parsed)) throw new Error('Saved list has an unsupported format. Clear list to reset it.')
    for (const item of parsed) {
      if (!item.id || !['shirt', 'jacket'].includes(item.category) ||
          typeof item.garmentImageBase64 !== 'string' || typeof item.previewImageBase64 !== 'string') {
        throw new Error('Saved list contains an unreadable item. Clear list to reset it.')
      }
    }
    return parsed as StoredShoppingItem[]
  }

  write(items: StoredShoppingItem[]): void {
    const json = JSON.stringify(items)
    const previous = this.store.getString(STORAGE_KEY)
    const used = this.store.getSizeInBytes()
    const maximum = this.store.getMaxSizeInBytes()
    // Conservative UTF-16 budget; all image data is ASCII Base64.
    if (maximum > 0 && used + Math.max(0, json.length - previous.length) * 2 + 512 > maximum) {
      throw new Error('Device list is full. Your saved items are safe; clear the list to make room.')
    }
    this.full = false
    this.store.putString(STORAGE_KEY, json)
    if (this.full || this.store.getString(STORAGE_KEY) !== json) {
      if (previous) this.store.putString(STORAGE_KEY, previous)
      else this.store.remove(STORAGE_KEY)
      throw new Error('Device could not save this item. Your previous list is unchanged.')
    }
  }

  clear(): void { this.store.remove(STORAGE_KEY) }
  getMaxBytes(): number { return this.store.getMaxSizeInBytes() }
}

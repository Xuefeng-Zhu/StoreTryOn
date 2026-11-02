export type GarmentCategory = 'shirt' | 'jacket'
export type TryOnPhase = 'ready' | 'capturing' | 'generating' | 'result' | 'error'
export interface StoredShoppingItem {
  id: string
  category: GarmentCategory
  garmentImageBase64: string
  previewImageBase64: string
  sample: boolean
  createdAt: number
}
export interface StoreTryOnSnapshot {
  phase: TryOnPhase
  busy: boolean
  category: GarmentCategory
  shopperReady: boolean
  garmentReady: boolean
  previewReady: boolean
  sampleMode: boolean
  listOpen: boolean
  savedCount: number
  selectedIndex: number
  message: string
}

/** Domain state only. Images and controls are owned by the controller/view. */
export class StoreTryOnState {
  phase: TryOnPhase = 'ready'
  category: GarmentCategory = 'shirt'
  shopper: Texture | null = null
  garment: Texture | null = null
  preview: Texture | null = null
  sampleMode = true
  listOpen = false
  selectedIndex = 0
  items: StoredShoppingItem[] = []
  message = 'Start with your photo, then capture one garment.'
  captureRevision = 0
  savedRevision = -1

  get busy(): boolean { return this.phase === 'capturing' || this.phase === 'generating' }

  invalidateResult(): void {
    this.preview = null
    this.phase = 'ready'
    this.captureRevision++
    this.savedRevision = -1
  }

  snapshot(): StoreTryOnSnapshot {
    return {
      phase: this.phase, busy: this.busy, category: this.category,
      shopperReady: this.shopper !== null, garmentReady: this.garment !== null,
      previewReady: this.preview !== null, sampleMode: this.sampleMode,
      listOpen: this.listOpen, savedCount: this.items.length,
      selectedIndex: this.selectedIndex, message: this.message,
    }
  }
}

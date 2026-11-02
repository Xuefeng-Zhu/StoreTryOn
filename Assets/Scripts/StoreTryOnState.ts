export type GarmentCategory = 'shirt' | 'jacket'
export type TryOnPhase = 'ready' | 'capturing' | 'generating' | 'saving' | 'result' | 'error'
export type StoreTryOnScreen = 'shopper' | 'garment' | 'review' | 'generating' | 'result' | 'list' | 'item' | 'settings'
export type RecoveryAction = 'ShopperPhoto' | 'CaptureGarment' | 'TryOn' | 'AddToList'
export interface StoredShoppingItem {
  id: string
  category: GarmentCategory
  garmentImageBase64: string
  previewImageBase64: string
  /** Legacy flag: true identifies an illustrative result, not its input source. */
  sample: boolean
  generatedByYouCam?: boolean
  syntheticInputs?: boolean
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
  useLiveApi: boolean
  previewFromLiveApi: boolean
  isEditor: boolean
  listOpen: boolean
  savedCount: number
  selectedIndex: number
  message: string
  screen: StoreTryOnScreen
  serviceReady: boolean
  storageReady: boolean
  savedCurrent: boolean
  clearConfirmation: boolean
  errorAction: RecoveryAction | null
}

/** Domain state only. Images and controls are owned by the controller/view. */
export class StoreTryOnState {
  phase: TryOnPhase = 'ready'
  category: GarmentCategory = 'shirt'
  shopper: Texture | null = null
  garment: Texture | null = null
  preview: Texture | null = null
  sampleMode = true
  useLiveApi = false
  previewFromLiveApi = false
  isEditor = false
  screen: StoreTryOnScreen = 'shopper'
  returnScreen: StoreTryOnScreen = 'shopper'
  settingsReturnScreen: StoreTryOnScreen = 'shopper'
  serviceReady = false
  storageReady = true
  clearConfirmation = false
  errorAction: RecoveryAction | null = null
  selectedIndex = 0
  items: StoredShoppingItem[] = []
  message = ''
  captureRevision = 0
  savedRevision = -1

  get busy(): boolean { return this.phase === 'capturing' || this.phase === 'generating' || this.phase === 'saving' }
  get listOpen(): boolean { return this.screen === 'list' || this.screen === 'item' }

  invalidateResult(): void {
    this.preview = null
    this.previewFromLiveApi = false
    this.phase = 'ready'
    this.errorAction = null
    this.message = ''
    this.captureRevision++
    this.savedRevision = -1
  }

  snapshot(): StoreTryOnSnapshot {
    return {
      phase: this.phase, busy: this.busy, category: this.category,
      shopperReady: this.shopper !== null, garmentReady: this.garment !== null,
      previewReady: this.preview !== null, sampleMode: this.sampleMode,
      useLiveApi: this.useLiveApi, previewFromLiveApi: this.previewFromLiveApi,
      isEditor: this.isEditor,
      listOpen: this.listOpen, savedCount: this.items.length,
      selectedIndex: this.selectedIndex, message: this.message,
      screen: this.screen, serviceReady: this.serviceReady, storageReady: this.storageReady,
      savedCurrent: this.preview !== null && this.savedRevision === this.captureRevision,
      clearConfirmation: this.clearConfirmation, errorAction: this.errorAction,
    }
  }
}

import {StoreTryOnPanelUI, StoreTryOnAction, StoreTryOnCard} from './StoreTryOnPanelUI'
import {StoreTryOnState, StoredShoppingItem, StoreTryOnScreen, RecoveryAction} from './StoreTryOnState'
import {StoreTryOnStorage} from './StoreTryOnStorage'
import {StoreTryOnCapture} from './StoreTryOnCapture'
import {StoreTryOnProxy, StoreTryOnServiceError} from './StoreTryOnProxy'
import {resolvePreviewProxySettings} from './StoreTryOnPreviewSettings'
import {encodeImage, decodeImage, makeThumbnail} from './StoreTryOnImages'

const CLICK = requireAsset('../GeneratedSFX/StoreTryOnClick.wav') as AudioTrackAsset
const SAVED = requireAsset('../GeneratedSFX/StoreTryOnSaved.wav') as AudioTrackAsset

@component
export class StoreTryOnMain extends BaseScriptComponent {
  @input @hint('UIKit shopping window. Wire the StoreTryOnPanelUI component.')
  ui!: StoreTryOnPanelUI
  @input @hint('HTTPS proxy URL. The YouCam API key belongs only on its server.')
  proxyBaseUrl: string = ''
  @input @hint('Independent proxy access token. Never enter a YouCam API key here.')
  proxyAccessToken: string = ''
  @input @allowUndefined @hint('Synthetic shopper photo for labelled editor previews.')
  sampleShopper: Texture | null = null
  @input @allowUndefined @hint('Synthetic shirt photo for editor previews.')
  sampleShirt: Texture | null = null
  @input @allowUndefined @hint('Synthetic jacket photo for editor previews.')
  sampleJacket: Texture | null = null
  @input @allowUndefined @hint('Illustrative shirt result, not a YouCam result.')
  sampleShirtPreview: Texture | null = null
  @input @allowUndefined @hint('Illustrative jacket result, not a YouCam result.')
  sampleJacketPreview: Texture | null = null
  @input @hint('Maximum saved entries; no automatic eviction.') @widget(new SliderWidget(1, 12, 1))
  maxItems: number = 6
  @input @hint('Interaction sound volume.') @widget(new SliderWidget(0, 1, 0.05))
  soundVolume: number = 0.3

  readonly state = new StoreTryOnState()
  private storage!: StoreTryOnStorage
  private capture!: StoreTryOnCapture
  private proxy!: StoreTryOnProxy
  private clickAudio!: AudioComponent
  private savedAudio!: AudioComponent
  private readRevision = 0
  private active = true
  private resultRevision = -1
  private cardTextures: Record<string, Texture> = {}

  onAwake(): void {
    this.createEvent('OnStartEvent').bind(() => this.start())
    this.createEvent('OnDestroyEvent').bind(() => {
      this.active = false; this.readRevision++; this.capture?.stop(); this.proxy?.discardPending()
    })
  }

  private start(): void {
    if (!this.ui) { print('[StoreTryOn] Missing UI component.'); return }
    this.storage = new StoreTryOnStorage()
    this.capture = new StoreTryOnCapture()
    this.state.isEditor = global.deviceInfoSystem.isEditor()
    try {
      const settings = resolvePreviewProxySettings(this.proxyBaseUrl, this.proxyAccessToken, this.state.isEditor)
      // Runtime only: no credential is written to the authored scene.
      this.proxyBaseUrl = settings.baseUrl; this.proxyAccessToken = settings.accessToken
    } catch (_) { this.state.message = 'Live preview setup needs attention in Preview settings.' }
    this.proxy = new StoreTryOnProxy(this.proxyBaseUrl, this.proxyAccessToken, seconds => this.delay(seconds))
    this.state.sampleMode = this.state.isEditor
    this.state.useLiveApi = true
    this.state.serviceReady = this.proxy.configured()
    this.clickAudio = this.sceneObject.createComponent('Component.AudioComponent') as AudioComponent
    this.clickAudio.audioTrack = CLICK; this.clickAudio.volume = this.soundVolume
    this.savedAudio = this.sceneObject.createComponent('Component.AudioComponent') as AudioComponent
    this.savedAudio.audioTrack = SAVED; this.savedAudio.volume = this.soundVolume
    try { this.state.items = this.storage.read() }
    catch (_) {
      this.state.storageReady = false
      this.state.message = 'Your saved list could not be opened. Reset it from Shopping list.'
    }
    this.ui.onAction.add(action => { this.handleAction(action).catch(error => this.fail(error, this.recoveryFor(action))) })
    if (!this.state.sampleMode) {
      try { this.capture.start() }
      catch (_) {
        this.state.phase = 'error'; this.state.errorAction = 'ShopperPhoto'
        this.state.message = 'Camera access is needed. Check SPECS permissions, then try again.'
      }
    }
    this.refresh()
    print('[StoreTryOn] Ready. Inputs=' + (this.state.sampleMode ? 'sample' : 'camera') +
      '; generation=YouCam; configured=' + this.state.serviceReady + '; saved=' + this.state.items.length)
  }

  getSnapshot(): ReturnType<StoreTryOnState['snapshot']> { return this.state.snapshot() }
  getSavedItems(): StoredShoppingItem[] { return this.storage ? this.storage.read() : [] }
  getControl(action: StoreTryOnAction): SceneObject | null { return this.ui.getControl(action) }
  canResumeTryOn(): boolean { return !!this.proxy && this.proxy.hasPendingJob() }

  /** Guarded route shared by UIKit and explicit diagnostics. */
  async handleAction(action: StoreTryOnAction): Promise<void> {
    if (!this.storage || !this.active) return
    const browsing = action === 'ShoppingList' || action === 'Back' || action === 'ViewTryOn' ||
      action === 'ClearList' || action === 'CancelClear' || action === 'ConfirmClear' ||
      action === 'Previous' || action === 'Next' || action.startsWith('OpenItem:')
    if (this.state.busy && !(this.state.phase === 'generating' && browsing)) return
    if (this.state.clearConfirmation && action !== 'ConfirmClear' && action !== 'CancelClear') return
    this.clickAudio.play(1)
    try {
      if (action.startsWith('OpenItem:')) {
        if (!this.state.listOpen) return
        const index = Number(action.slice(9))
        if (!Number.isInteger(index) || !this.state.items[index]) return
        this.state.selectedIndex = index; this.state.screen = 'item'; await this.showSaved()
      } else switch (action) {
        case 'ShopperPhoto': await this.capturePhoto(true); break
        case 'CaptureGarment': await this.capturePhoto(false); break
        case 'Continue':
          if (this.state.screen === 'shopper' && this.state.shopper) { this.clearError(); this.state.screen = 'garment' }
          break
        case 'RetakeShopper': this.clearError(); this.state.screen = 'shopper'; break
        case 'RetakeGarment': this.clearError(); this.state.screen = 'garment'; break
        case 'TryOn': await this.generate(); break
        case 'AddToList': await this.saveItem(); break
        case 'Shirt': this.changeCategory('shirt'); break
        case 'Jacket': this.changeCategory('jacket'); break
        case 'TryAnother':
          if (!this.state.shopper) { this.state.screen = 'shopper'; break }
          this.proxy.discardPending()
          this.state.garment = null; this.state.invalidateResult(); this.resultRevision = -1; this.state.screen = 'garment'
          break
        case 'Settings':
          if (this.state.isEditor) { this.state.settingsReturnScreen = this.state.screen; this.state.screen = 'settings' }
          break
        case 'ToggleMode':
          if (!this.state.isEditor || this.state.screen !== 'settings') break
          this.proxy.discardPending()
          this.state.useLiveApi = !this.state.useLiveApi; this.state.invalidateResult(); this.resultRevision = -1
          break
        case 'NewVisit':
          if (!this.state.isEditor || this.state.screen !== 'settings') break
          this.proxy.discardPending()
          this.state.shopper = null; this.state.garment = null; this.state.invalidateResult()
          this.resultRevision = -1; this.state.screen = 'shopper'
          break
        case 'ShoppingList':
          if (!this.state.listOpen) this.state.returnScreen = this.state.screen
          this.state.screen = 'list'; await this.showCollection()
          break
        case 'Back': {
          const wasDetail = this.state.screen === 'item'
          this.goBack()
          if (wasDetail) await this.showCollection()
          break
        }
        case 'ViewTryOn': this.state.screen = this.currentTryOnScreen(); break
        case 'Previous': case 'Next':
          if (this.state.screen !== 'item' || !this.state.items.length) break
          this.state.selectedIndex = (this.state.selectedIndex + (action === 'Next' ? 1 : -1) + this.state.items.length) % this.state.items.length
          await this.showSaved()
          break
        case 'ClearList': if (this.state.listOpen) this.state.clearConfirmation = true; break
        case 'CancelClear': this.state.clearConfirmation = false; break
        case 'ConfirmClear':
          if (!this.state.clearConfirmation || !this.state.listOpen) break
          this.storage.clear(); this.state.storageReady = true; this.state.items = []; this.cardTextures = {}; this.readRevision++
          this.state.selectedIndex = 0; this.state.savedRevision = -1
          this.state.clearConfirmation = false; this.state.screen = 'list'
          this.ui.renderCollection([]); this.ui.renderSaved(null, null, '')
          break
        case 'Retry':
          if (this.state.errorAction) {
            const recovery = this.state.errorAction; this.clearError()
            this.state.screen = recovery === 'ShopperPhoto' ? 'shopper' : recovery === 'CaptureGarment' ? 'garment' : recovery === 'TryOn' ? 'review' : 'result'
            await this.handleAction(recovery)
          }
          break
      }
    } catch (error) { this.fail(error, this.recoveryFor(action)) }
    this.refresh()
  }

  private clearError(): void {
    if (this.state.phase === 'error') this.state.phase = this.state.preview ? 'result' : 'ready'
    this.state.errorAction = null; this.state.message = ''
  }
  private currentTryOnScreen(): StoreTryOnScreen {
    if (this.state.phase === 'generating') return 'generating'
    if (this.state.preview) return 'result'
    if (this.state.garment && this.state.shopper) return 'review'
    return this.state.shopper ? 'garment' : 'shopper'
  }
  private goBack(): void {
    this.state.clearConfirmation = false
    if (this.state.screen === 'item') this.state.screen = 'list'
    else if (this.state.screen === 'list') this.state.screen = this.validReturnScreen(this.state.returnScreen)
    else if (this.state.screen === 'settings') this.state.screen = this.validReturnScreen(this.state.settingsReturnScreen)
    else if (this.state.screen === 'review') { this.clearError(); this.state.screen = 'garment' }
    else if (this.state.screen === 'garment') { this.clearError(); this.state.screen = 'shopper' }
    else if (this.state.screen === 'result') { this.clearError(); this.state.screen = 'review' }
  }
  private validReturnScreen(screen: StoreTryOnScreen): StoreTryOnScreen {
    if ((screen === 'result' && !this.state.preview) || screen === 'generating') return this.currentTryOnScreen()
    return screen
  }

  private async capturePhoto(shopper: boolean): Promise<void> {
    if (shopper && this.state.screen !== 'shopper') return
    if (!shopper && (this.state.screen !== 'garment' || !this.state.shopper)) return
    this.state.phase = 'capturing'; this.state.errorAction = null
    this.state.message = this.state.sampleMode ? 'Loading photo…' : 'Capturing photo…'; this.refresh()
    let texture: Texture | null
    if (this.state.sampleMode) {
      await this.delay(0.25)
      texture = shopper ? this.sampleShopper : this.state.category === 'shirt' ? this.sampleShirt : this.sampleJacket
      if (!texture) throw new Error('This preview photo is unavailable. Check Preview settings and try again.')
    } else {
      this.capture.start(); texture = await this.capture.capture()
    }
    if (!this.active) return
    this.proxy.discardPending()
    if (shopper) this.state.shopper = texture
    else this.state.garment = texture
    this.state.invalidateResult(); this.resultRevision = -1
    this.state.screen = shopper ? 'shopper' : 'review'
  }
  private changeCategory(category: 'shirt' | 'jacket'): void {
    if (this.state.screen !== 'garment' && this.state.screen !== 'review') return
    if (this.state.category === category) return
    this.proxy.discardPending()
    this.state.category = category; this.state.garment = null; this.state.invalidateResult()
    this.resultRevision = -1; this.state.screen = 'garment'
  }
  private async generate(): Promise<void> {
    if (this.state.screen !== 'review') return
    if (!this.state.shopper || !this.state.garment) throw new Error('Choose your photo and capture a garment first.')
    if (this.state.useLiveApi && !this.proxy.configured()) throw new StoreTryOnServiceError('configuration_missing')
    const revision = this.state.captureRevision
    this.state.preview = null; this.state.previewFromLiveApi = false; this.state.phase = 'generating'
    this.state.screen = 'generating'; this.state.errorAction = null
    this.state.message = this.state.useLiveApi ? 'Sending your photos…' : 'Preparing illustration…'; this.refresh()
    let generated: Texture
    if (!this.state.useLiveApi) {
      await this.delay(0.8)
      const fixture = this.state.category === 'shirt' ? this.sampleShirtPreview : this.sampleJacketPreview
      if (!fixture) throw new Error('This illustration is unavailable. Check Preview settings and try again.')
      generated = fixture
    } else {
      const shopper = await encodeImage(this.state.shopper), garment = await encodeImage(this.state.garment)
      if (!this.active || revision !== this.state.captureRevision) return
      const encoded = await this.proxy.generate(shopper, garment, this.state.category, message => {
        if (this.active && revision === this.state.captureRevision) { this.state.message = message; this.refresh() }
      })
      this.state.message = 'Loading your preview…'; this.refresh()
      try { generated = await decodeImage(encoded) }
      catch (_) { throw new Error('Your preview could not be opened. Keep these photos and try again.') }
    }
    if (!this.active || revision !== this.state.captureRevision) return
    if (this.state.useLiveApi) this.proxy.discardPending()
    this.state.preview = generated; this.state.previewFromLiveApi = this.state.useLiveApi; this.resultRevision = revision
    this.state.phase = 'result'; this.state.savedRevision = -1; this.state.errorAction = null
    this.state.message = this.state.useLiveApi ? 'Your preview is ready.' : 'Illustrative preview · not generated by YouCam.'
    if (this.state.screen === 'generating') this.state.screen = 'result'
  }
  private async saveItem(): Promise<void> {
    if (this.state.screen !== 'result') return
    if (!this.state.storageReady) throw new Error('Your saved list needs attention. Open Shopping list to reset it before saving another look.')
    if (!this.state.preview || !this.state.garment || this.resultRevision !== this.state.captureRevision) throw new Error('Create a preview for this garment before saving.')
    if (this.state.savedRevision === this.state.captureRevision) return
    if (this.state.items.length >= this.maxItems) throw new Error('Your shopping list is full. Open it to clear saved items, then save this look.')
    this.state.phase = 'saving'; this.state.message = 'Saving your look…'; this.state.errorAction = null; this.refresh()
    const garment = await encodeImage(makeThumbnail(this.state.garment), CompressionQuality.LowQuality)
    const preview = await encodeImage(makeThumbnail(this.state.preview), CompressionQuality.LowQuality)
    if (!this.active) return
    const entry: StoredShoppingItem = {
      id: Date.now().toString(36) + '-' + this.state.captureRevision, category: this.state.category,
      garmentImageBase64: garment, previewImageBase64: preview, sample: !this.state.previewFromLiveApi,
      generatedByYouCam: this.state.previewFromLiveApi, syntheticInputs: this.state.sampleMode, createdAt: Date.now(),
    }
    const items = this.state.items.concat([entry]); this.storage.write(items)
    this.state.items = items; this.state.savedRevision = this.state.captureRevision
    this.state.phase = 'result'; this.state.message = 'Added to your shopping list.'; this.savedAudio.play(1)
    print('[StoreTryOn] Saved ' + entry.category + '; generatedByYouCam=' + entry.generatedByYouCam +
      '; syntheticInputs=' + entry.syntheticInputs + '; count=' + items.length)
  }
  private async showCollection(): Promise<void> {
    const revision = ++this.readRevision
    const cards: StoreTryOnCard[] = this.state.items.map((item, index) => ({
      index, category: item.category, image: this.cardTextures[item.id] || null,
      generatedByYouCam: item.generatedByYouCam ?? !item.sample, syntheticInputs: item.syntheticInputs === true,
    }))
    this.ui.renderCollection(cards); this.refresh()
    await Promise.all(this.state.items.map(async (item, index) => {
      if (!cards[index].image) {
        try { cards[index].image = await decodeImage(item.previewImageBase64) } catch (_) { /* Keep other cards usable. */ }
      }
      if (!this.active || revision !== this.readRevision) return
      if (cards[index].image) this.cardTextures[item.id] = cards[index].image!
    }))
    if (this.active && revision === this.readRevision) this.ui.renderCollection(cards)
  }
  private async showSaved(): Promise<void> {
    const revision = ++this.readRevision, item = this.state.items[this.state.selectedIndex]
    this.ui.renderSaved(null, null, 'Loading saved photos…'); this.refresh()
    if (!item) return
    try {
      const images = await Promise.all([decodeImage(item.garmentImageBase64), decodeImage(item.previewImageBase64)])
      if (!this.active || revision !== this.readRevision) return
      const live = item.generatedByYouCam ?? !item.sample
      const provenance = live ? item.syntheticInputs ? 'YouCam preview · sample photos' : 'YouCam preview' : 'Illustrative preview · not YouCam'
      this.ui.renderSaved(images[0], images[1], provenance + ' · saved on this device')
    } catch (_) {
      if (this.active && revision === this.readRevision) this.ui.renderSaved(null, null, 'These saved photos could not be opened. Other items are still available.')
    }
  }
  private refresh(): void {
    if (this.active) this.ui.render(this.state.snapshot(), this.state.garment, this.state.shopper, this.state.preview)
  }
  private recoveryFor(action: StoreTryOnAction): RecoveryAction | null {
    if (action === 'ShopperPhoto' || action === 'CaptureGarment' || action === 'TryOn' || action === 'AddToList') return action
    return null
  }
  private fail(error: unknown, action: RecoveryAction | null): void {
    if (!this.active) return
    this.state.phase = 'error'
    this.state.errorAction = error instanceof StoreTryOnServiceError && !error.retryable ? null : action
    this.state.message = error instanceof Error ? error.message : 'Something went wrong. Please try again.'
    if (action === 'TryOn' && this.state.screen === 'generating') this.state.screen = 'review'
    this.refresh()
    print('[StoreTryOn] Action failed' + (error instanceof StoreTryOnServiceError ? '; code=' + error.code : '') + '.')
  }
  private delay(seconds: number): Promise<void> {
    return new Promise(resolve => {
      const event = this.createEvent('DelayedCallbackEvent')
      event.bind(() => resolve()); event.reset(seconds)
    })
  }
}

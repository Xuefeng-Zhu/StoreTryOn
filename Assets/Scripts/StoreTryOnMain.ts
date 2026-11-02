import {StoreTryOnPanelUI, StoreTryOnAction} from './StoreTryOnPanelUI'
import {StoreTryOnState, StoredShoppingItem} from './StoreTryOnState'
import {StoreTryOnStorage} from './StoreTryOnStorage'
import {StoreTryOnCapture} from './StoreTryOnCapture'
import {StoreTryOnProxy} from './StoreTryOnProxy'
import {encodeImage, decodeImage, makeThumbnail} from './StoreTryOnImages'

const CLICK = requireAsset('../GeneratedSFX/StoreTryOnClick.wav') as AudioTrackAsset
const SAVED = requireAsset('../GeneratedSFX/StoreTryOnSaved.wav') as AudioTrackAsset

@component
export class StoreTryOnMain extends BaseScriptComponent {
  @input @hint('UIKit shopping window. Wire the StoreTryOnPanelUI component.')
  ui!: StoreTryOnPanelUI
  @input @hint('HTTPS URL of the secure YouCam proxy. The provider API key belongs only on its server.')
  proxyBaseUrl: string = ''
  @input @hint('Independent, revocable proxy access token. Never enter your YouCam API key here.')
  proxyAccessToken: string = ''
  @input @allowUndefined @hint('Synthetic shopper fixture for clearly labelled editor samples.')
  sampleShopper: Texture | null = null
  @input @allowUndefined @hint('Sample shirt fixture.')
  sampleShirt: Texture | null = null
  @input @allowUndefined @hint('Sample jacket fixture.')
  sampleJacket: Texture | null = null
  @input @allowUndefined @hint('Illustrative sample shirt result; not an API-generated result.')
  sampleShirtPreview: Texture | null = null
  @input @allowUndefined @hint('Illustrative sample jacket result; not an API-generated result.')
  sampleJacketPreview: Texture | null = null
  @input @hint('Maximum retained entries. Existing entries are never evicted automatically.') @widget(new SliderWidget(1, 12, 1))
  maxItems: number = 6
  @input @hint('Volume of action and saved confirmation sounds.') @widget(new SliderWidget(0, 1, 0.05))
  soundVolume: number = 0.3

  readonly state = new StoreTryOnState()
  private storage!: StoreTryOnStorage
  private capture!: StoreTryOnCapture
  private proxy!: StoreTryOnProxy
  private clickAudio!: AudioComponent
  private savedAudio!: AudioComponent
  private clearArmed = false
  private readRevision = 0
  private active = true

  onAwake(): void {
    this.createEvent('OnStartEvent').bind(() => this.start())
    this.createEvent('OnDestroyEvent').bind(() => { this.active = false; this.capture?.stop() })
  }

  private start(): void {
    if (!this.ui) { print('[StoreTryOn] Missing UI component.'); return }
    this.storage = new StoreTryOnStorage()
    this.capture = new StoreTryOnCapture()
    this.proxy = new StoreTryOnProxy(this.proxyBaseUrl, this.proxyAccessToken, seconds => this.delay(seconds))
    this.clickAudio = this.sceneObject.createComponent('Component.AudioComponent') as AudioComponent
    this.clickAudio.audioTrack = CLICK; this.clickAudio.volume = this.soundVolume
    this.savedAudio = this.sceneObject.createComponent('Component.AudioComponent') as AudioComponent
    this.savedAudio.audioTrack = SAVED; this.savedAudio.volume = this.soundVolume
    this.state.sampleMode = global.deviceInfoSystem.isEditor()
    try { this.state.items = this.storage.read() }
    catch (_) { this.state.message = 'Saved list could not be read. Open Shopping list, then Clear list to reset.' }
    this.ui.onAction.add(action => { this.handleAction(action).catch(error => this.fail(error)) })
    if (!this.state.sampleMode) {
      try { this.capture.start() }
      catch (_) { this.state.message = 'Camera permission is needed. Check SPECS permission settings or use sample mode.' }
    }
    this.refresh()
    print('[StoreTryOn] Ready. Mode=' + (this.state.sampleMode ? 'sample' : 'live') + '; saved=' + this.state.items.length + '; storageQuota=' + this.storage.getMaxBytes())
  }

  getSnapshot(): ReturnType<StoreTryOnState['snapshot']> { return this.state.snapshot() }
  getSavedItems(): StoredShoppingItem[] { return this.storage ? this.storage.read() : [] }
  getControl(action: StoreTryOnAction): SceneObject | null { return this.ui.getControl(action) }

  /** Called only by the UIKit action event. Public for explicit diagnostic use. */
  async handleAction(action: StoreTryOnAction): Promise<void> {
    if (!this.storage || !this.active) return
    if (this.state.busy) return
    if (action !== 'ClearList') this.clearArmed = false
    this.clickAudio.play(1)
    switch (action) {
      case 'ShopperPhoto': await this.capturePhoto(true); break
      case 'CaptureGarment': await this.capturePhoto(false); break
      case 'TryOn': await this.generate(); break
      case 'AddToList': await this.saveItem(); break
      case 'Shirt': this.changeCategory('shirt'); break
      case 'Jacket': this.changeCategory('jacket'); break
      case 'ToggleMode':
        this.state.sampleMode = !this.state.sampleMode
        this.state.shopper = null; this.state.garment = null; this.state.invalidateResult()
        if (this.state.sampleMode) this.capture.stop()
        else if (!global.deviceInfoSystem.isEditor()) this.capture.start()
        this.state.message = this.state.sampleMode ? 'Sample mode uses synthetic images; no API request is made.' : 'Capture your own photo first. Try-on uploads both photos to YouCam.'
        break
      case 'ShoppingList': this.state.listOpen = true; this.state.selectedIndex = 0; await this.showSaved(); break
      case 'Back': this.state.listOpen = false; break
      case 'Previous': this.moveSaved(-1); await this.showSaved(); break
      case 'Next': this.moveSaved(1); await this.showSaved(); break
      case 'ClearList':
        if (!this.clearArmed && this.state.items.length) {
          this.clearArmed = true
          this.ui.renderSaved(null, null, 'Tap Clear list again to delete all saved items and local image data.')
        } else {
          this.storage.clear(); this.state.items = []; this.state.selectedIndex = 0
          this.state.savedRevision = -1; this.clearArmed = false
          await this.showSaved()
          this.state.message = 'Shopping list cleared on this device.'
        }
        break
    }
    this.refresh()
  }

  private async capturePhoto(shopper: boolean): Promise<void> {
    this.state.phase = 'capturing'
    this.state.message = this.state.sampleMode ? 'Loading labelled sample image…' : 'Capturing photo…'
    this.refresh()
    let texture: Texture | null
    if (this.state.sampleMode) {
      await this.delay(0.25)
      texture = shopper ? this.sampleShopper : this.state.category === 'shirt' ? this.sampleShirt : this.sampleJacket
      if (!texture) throw new Error('Sample asset is not configured. Select the fixture in the controller Inspector.')
    } else texture = await this.capture.capture()
    if (!this.active) return
    if (shopper) this.state.shopper = texture
    else this.state.garment = texture
    this.state.invalidateResult()
    this.state.message = shopper ? 'Your photo is ready and will be reused during this visit.' : 'Garment captured. Check the category, then Try it on.'
  }

  private changeCategory(category: 'shirt' | 'jacket'): void {
    if (this.state.category === category) return
    this.state.category = category; this.state.garment = null; this.state.invalidateResult()
    this.state.message = category === 'jacket' ? 'Jacket selected · layers over your outfit. Capture this garment.' : 'Shirt selected. Capture this garment.'
  }

  private async generate(): Promise<void> {
    if (!this.state.shopper || !this.state.garment) throw new Error('Capture your photo and a garment before trying it on.')
    this.state.preview = null; this.state.phase = 'generating'
    this.state.message = this.state.sampleMode ? 'Preparing illustrative sample… no API request' : 'Uploading photos securely to YouCam…'
    this.refresh()
    if (this.state.sampleMode) {
      await this.delay(0.6)
      const sample = this.state.category === 'shirt' ? this.sampleShirtPreview : this.sampleJacketPreview
      if (!sample) throw new Error('Illustrative sample result is not configured.')
      this.state.preview = sample
      this.state.message = 'Illustrative sample only — this is NOT a live YouCam result.'
    } else {
      if (!this.proxy.configured()) throw new Error('Live try-on needs a deployed HTTPS proxy and access token. Use sample mode to explore the flow.')
      const shopper = await encodeImage(this.state.shopper)
      const garment = await encodeImage(this.state.garment)
      const generated = await this.proxy.generate(shopper, garment, this.state.category, message => {
        this.state.message = message; this.refresh()
      })
      this.state.preview = await decodeImage(generated)
      if (!this.active) return
      this.state.message = 'YouCam preview ready. Generated appearance may differ from actual fit.'
    }
    this.state.phase = 'result'
    this.state.savedRevision = -1
  }

  private async saveItem(): Promise<void> {
    if (!this.state.preview || !this.state.garment) throw new Error('Generate a try-on preview before adding it.')
    if (this.state.savedRevision === this.state.captureRevision) {
      this.state.message = 'This item is already in your shopping list.'; return
    }
    if (this.state.items.length >= this.maxItems) throw new Error('Shopping list is full. Saved items stay until you clear it.')
    this.state.phase = 'capturing'; this.state.message = 'Saving photos on this device…'; this.refresh()
    const garment = await encodeImage(makeThumbnail(this.state.garment), CompressionQuality.LowQuality)
    const preview = await encodeImage(makeThumbnail(this.state.preview), CompressionQuality.LowQuality)
    if (!this.active) return
    const entry: StoredShoppingItem = {
      id: Date.now().toString(36) + '-' + this.state.captureRevision,
      category: this.state.category, garmentImageBase64: garment, previewImageBase64: preview,
      sample: this.state.sampleMode, createdAt: Date.now(),
    }
    const items = this.state.items.concat([entry])
    this.storage.write(items)
    this.state.items = items; this.state.savedRevision = this.state.captureRevision
    this.state.phase = 'result'; this.state.message = 'Added to shopping list · photos saved on this device.'
    this.savedAudio.play(1)
    print('[StoreTryOn] Saved ' + entry.category + '; sample=' + entry.sample + '; count=' + items.length)
  }

  private moveSaved(delta: number): void {
    const count = this.state.items.length
    if (count) this.state.selectedIndex = (this.state.selectedIndex + delta + count) % count
  }

  private async showSaved(): Promise<void> {
    const revision = ++this.readRevision
    if (!this.state.items.length) { this.ui.renderSaved(null, null, 'No saved items yet. Try on a garment and add it.'); return }
    const item = this.state.items[this.state.selectedIndex]
    const garment = await decodeImage(item.garmentImageBase64)
    const preview = await decodeImage(item.previewImageBase64)
    if (revision !== this.readRevision) return
    this.ui.renderSaved(garment, preview, (item.category === 'shirt' ? 'Shirt' : 'Jacket') + (item.sample ? '\nSAMPLE · illustrative preview' : '\nYouCam-generated preview') + '\nPhoto thumbnails saved on this device')
  }

  private refresh(): void {
    this.ui.render(this.state.snapshot(), this.state.garment, this.state.preview || this.state.shopper)
  }

  private fail(error: unknown): void {
    this.state.phase = 'error'
    this.state.message = error instanceof Error ? error.message : 'Something went wrong. Please retry.'
    this.refresh()
    print('[StoreTryOn] Action failed: ' + this.state.message)
  }

  private delay(seconds: number): Promise<void> {
    return new Promise(resolve => {
      const event = this.createEvent('DelayedCallbackEvent')
      event.bind(() => resolve())
      event.reset(seconds)
    })
  }
}

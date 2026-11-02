import {DefaultLeafInteractor} from 'Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor'
import {findSceneObjectByName, sleep} from 'Leaf.lspkg/Utils/common/Utils'
import {expect} from 'Leaf.lspkg/Utils/common/Expect'
import {Button} from 'SpectaclesUIKit.lspkg/Scripts/Components/Button/Button'
import {ScrollWindow} from 'SpectaclesUIKit.lspkg/Scripts/Components/ScrollWindow/ScrollWindow'
import {Interactable} from 'SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable'
import {StoreTryOnMain} from '../Scripts/StoreTryOnMain'
import {StoreTryOnAction} from '../Scripts/StoreTryOnPanelUI'
import {StoredShoppingItem, StoreTryOnScreen} from '../Scripts/StoreTryOnState'
import {StoreTryOnStorage} from '../Scripts/StoreTryOnStorage'

// Changes whenever the Lens runtime is actually restarted. It lets a persistence
// verification reject a same-runtime read masquerading as a preview-reset test.
const runtimeToken = Date.now().toString(36) + '-' + Math.random().toString(36)
const checkpointKey = 'StoreTryOn.LEAF.checkpoint.v1'

type Checkpoint = {kind: 'seeded' | 'cleared', runtimeToken: string, fingerprint: string, count: number}

export class StoreTryOnHarness {
  readonly interactor = new DefaultLeafInteractor()
  constructor(readonly main: StoreTryOnMain, readonly root: SceneObject) {}

  static async open(illustrationMode = true): Promise<StoreTryOnHarness> {
    await sleep(1500)
    if (!global.deviceInfoSystem.isEditor()) throw new Error('These synthetic-data scenarios are preview-only. Hardware acceptance is a separate check.')
    const root = findSceneObjectByName('StoreTryOn')
    if (!root) throw new Error('Authored StoreTryOn root was not found.')
    const main = root.getComponent(StoreTryOnMain.getTypeName()) as StoreTryOnMain | null
    if (!main) throw new Error('StoreTryOnMain is not attached to StoreTryOn.')
    const harness = new StoreTryOnHarness(main, root)
    await harness.until(() => !!main.ui && main.ui.ready, 'UIKit initializes')
    await harness.idle()
    // Existing functional scenarios are explicitly free. Live UI scenarios
    // opt out so they can inspect the normal startup mode before any action.
    if (illustrationMode) await harness.sampleMode()
    return harness
  }

  target(action: StoreTryOnAction): Interactable {
    const object = this.main.getControl(action)
    if (!object) throw new Error('Missing source-declared control StoreTryOn.' + action)
    expect(object.name).toBe('StoreTryOn.' + action)
    expect(object.isEnabledInHierarchy).toBe(true)
    const button = object.getComponent(Button.getTypeName()) as Button | null
    if (!button || !button.interactable) throw new Error('UIKit Button has no SIK Interactable: ' + object.name)
    expect(button.interactable.enabled).toBe(true)
    expect(button.interactable.colliders.length > 0).toBe(true)
    return button.interactable
  }

  canActivate(action: StoreTryOnAction): boolean {
    const object = this.main.getControl(action)
    if (!object || !object.isEnabledInHierarchy) return false
    const button = object.getComponent(Button.getTypeName()) as Button | null
    return !!button && !!button.interactable && button.interactable.enabled && button.interactable.colliders.length > 0
  }

  async press(action: StoreTryOnAction): Promise<void> {
    await this.until(() => this.canActivate(action), 'active visible control ' + action)
    await this.interactor.trigger(this.target(action))
  }

  async tap(action: StoreTryOnAction, timeoutMs = 15000): Promise<void> {
    // Exercise SIK targeting and UIKit's trigger-up binding. Never call the
    // controller's handleAction() or invoke the UI action event directly.
    await this.press(action)
    await sleep(50)
    await this.idle(timeoutMs)
  }

  async until(condition: () => boolean, label: string, timeoutMs = 15000): Promise<void> {
    for (let elapsed = 0; elapsed < timeoutMs; elapsed += 50) {
      if (condition()) return
      await sleep(50)
    }
    throw new Error('Timed out waiting for ' + label + '; phase=' + this.main.getSnapshot().phase)
  }

  async idle(timeoutMs = 15000): Promise<void> { await this.until(() => !this.main.getSnapshot().busy, 'action completion', timeoutMs) }

  async capturePage(): Promise<void> {
    for (let i = 0; i < 5; i++) {
      const snapshot = this.main.getSnapshot()
      if (snapshot.clearConfirmation) { await this.tap('CancelClear'); continue }
      if (snapshot.screen === 'list' || snapshot.screen === 'item' || snapshot.screen === 'settings') { await this.tap('Back'); continue }
      break
    }
    expect(this.main.getSnapshot().listOpen).toBe(false)
  }

  async screen(screen: StoreTryOnScreen): Promise<void> {
    await this.until(() => this.main.getSnapshot().screen === screen, 'screen ' + screen)
    expect(this.main.getSnapshot().screen).toBe(screen)
  }

  async settings(): Promise<void> {
    if (this.main.getSnapshot().screen !== 'settings') {
      await this.capturePage()
      await this.tap('Settings')
    }
    await this.screen('settings')
  }

  async sampleMode(): Promise<void> {
    await this.settings()
    // In editor, ToggleMode changes generation mode; inputs remain synthetic.
    // Selecting sample inputs alone no longer guarantees a free illustration.
    expect(this.main.getSnapshot().isEditor).toBe(true)
    expect(this.main.getSnapshot().sampleMode).toBe(true)
    if (this.main.getSnapshot().useLiveApi) await this.tap('ToggleMode')
    expect(this.main.getSnapshot().useLiveApi).toBe(false)
    await this.tap('Back')
    expect(this.main.getSnapshot().screen === 'settings').toBe(false)
  }

  async freshVisit(): Promise<void> {
    await this.sampleMode()
    await this.newVisit()
    expect(this.main.getSnapshot().useLiveApi).toBe(false)
  }

  async newVisit(): Promise<void> {
    const before = this.main.getSnapshot().savedCount
    await this.settings()
    await this.tap('NewVisit')
    await this.screen('shopper')
    expect(this.main.getSnapshot().shopperReady).toBe(false)
    expect(this.main.getSnapshot().garmentReady).toBe(false)
    expect(this.main.getSnapshot().previewReady).toBe(false)
    expect(this.main.getSnapshot().savedCount).toBe(before)
  }

  async reviewGarment(category: 'shirt' | 'jacket' = 'shirt'): Promise<void> {
    await this.capturePage()
    const initial = this.main.getSnapshot().screen
    if (initial === 'result') await this.tap('TryAnother')
    else if (initial === 'review') await this.tap('RetakeGarment')
    if (this.main.getSnapshot().screen === 'shopper') {
      if (!this.main.getSnapshot().shopperReady) await this.tap('ShopperPhoto')
      await this.until(() => this.canActivate('Continue'), 'shopper review controls')
      this.assertPhotoRole('StoreTryOn.ShopperPhotoCard')
      await this.tap('Continue')
    }
    await this.screen('garment')
    if (this.main.getSnapshot().category !== category) await this.tap(category === 'shirt' ? 'Shirt' : 'Jacket')
    await this.tap('CaptureGarment')
    await this.screen('review')
    expect(this.main.getSnapshot().shopperReady).toBe(true)
    expect(this.main.getSnapshot().garmentReady).toBe(true)
    await this.until(() => this.canActivate('RetakeGarment'), 'garment review controls')
    this.assertPhotoRole('StoreTryOn.GarmentPhotoCard')
  }

  async shirtResult(): Promise<void> {
    await this.freshVisit()
    await this.reviewGarment('shirt')
    await this.tap('TryOn')
    const snapshot = this.main.getSnapshot()
    expect(snapshot.phase).toBe('result')
    expect(snapshot.previewReady).toBe(true)
    expect(snapshot.useLiveApi).toBe(false)
    expect(snapshot.previewFromLiveApi).toBe(false)
    expect(snapshot.screen).toBe('result')
    expect(this.visibleTextContains('not generated by YouCam')).toBe(true)
    this.assertPhotoRole('StoreTryOn.TryOnPreviewCard')
  }

  requireCapacity(slots: number): void {
    if (!this.main.getSnapshot().storageReady) throw new Error('Test precondition: saved list must be readable before adding fixture entries.')
    if (this.main.getSnapshot().savedCount + slots > this.main.maxItems) {
      throw new Error('Test precondition: ' + slots + ' free shopping-list slots required. Existing entries were preserved.')
    }
  }

  requireSyntheticList(): StoredShoppingItem[] {
    const items = new StoreTryOnStorage().read()
    if (items.some(item => item.syntheticInputs !== true && item.sample !== true)) {
      throw new Error('Refusing destructive synthetic-preview test: list contains an entry not marked as synthetic inputs or a legacy illustration.')
    }
    return items
  }

  async ensureSavedSample(): Promise<void> {
    if (this.main.getSnapshot().savedCount) return
    this.requireCapacity(1)
    await this.shirtResult()
    await this.tap('AddToList')
    expect(this.main.getSnapshot().savedCount).toBe(1)
  }

  async openList(): Promise<void> {
    if (this.main.getSnapshot().screen === 'item') await this.tap('Back')
    if (this.main.getSnapshot().screen !== 'list') {
      await this.capturePage()
      await this.tap('ShoppingList')
    }
    await this.screen('list')
  }

  async openItem(index: number): Promise<void> {
    await this.openList()
    const action = ('OpenItem:' + index) as StoreTryOnAction
    await this.until(() => {
      if (this.canActivate(action)) return true
      const host = this.main.ui.getCollectionScroll()
      const scroll = host?.getComponent(ScrollWindow.getTypeName()) as ScrollWindow | null
      return !!scroll && scroll.initialized
    }, 'collection layout initializes')
    for (let attempt = 0; attempt < 10 && !this.canActivate(action); attempt++) {
      const host = this.main.ui.getCollectionScroll()
      const scroll = host?.getComponent(ScrollWindow.getTypeName()) as ScrollWindow | null
      if (!scroll || !scroll.initialized || !scroll.interactable) throw new Error('Visible collection ScrollWindow is not initialized.')
      await this.interactor.drag(scroll.interactable, new vec3(0, 8, 0), 400)
      await sleep(100)
    }
    if (!this.canActivate(action)) throw new Error('Saved item ' + index + ' is not reachable through the actual collection scroll.')
    await this.tap(action)
    await this.screen('item')
    await this.until(() => this.visiblePhotos().length > 0 || this.visibleTextContains('could not be opened'), 'saved item photos decode')
  }

  visibleTextContains(fragment: string): boolean {
    return this.objects().some(object => {
      if (!object.isEnabledInHierarchy) return false
      const text = object.getComponent('Component.Text') as Text | null
      return !!text && text.enabled && text.text.includes(fragment)
    })
  }

  visiblePhotos(): Image[] {
    return this.objects().filter(object => object.name === 'StoreTryOn.PhotoPixels' && object.isEnabledInHierarchy)
      .map(object => object.getComponent('Component.Image') as Image | null)
      .filter(image => image !== null && image.enabled) as Image[]
  }

  assertPhotoRole(role: string): Image {
    const image = this.visiblePhotos().find(photo => {
      let object: SceneObject | null = photo.sceneObject
      while (object) {
        if (object.name === role) return true
        object = object.getParent()
      }
      return false
    })
    if (!image) throw new Error('Missing visible photo role ' + role + ' on screen ' + this.main.getSnapshot().screen)
    expect(image.mainPass.baseTex !== null).toBe(true)
    return image
  }

  private objects(): SceneObject[] {
    const result: SceneObject[] = []
    const visit = (object: SceneObject): void => {
      result.push(object)
      for (let i = 0; i < object.getChildrenCount(); i++) visit(object.getChild(i))
    }
    visit(this.root)
    return result
  }

  static async assertJpeg(encoded: string): Promise<void> {
    expect(encoded.startsWith('http')).toBe(false)
    const bytes = Base64.decode(encoded)
    expect(bytes.length > 100).toBe(true)
    expect(bytes[0]).toBe(255)
    expect(bytes[1]).toBe(216)
    expect(bytes[2]).toBe(255)
    const decoded = await new Promise<Texture>((resolve, reject) => {
      Base64.decodeTextureAsync(encoded, resolve, () => reject(new Error('Persisted JPEG cannot be decoded to a Texture.')))
    })
    expect(decoded.getWidth() > 0).toBe(true)
    expect(decoded.getHeight() > 0).toBe(true)
    expect(Math.max(decoded.getWidth(), decoded.getHeight()) <= 192).toBe(true)
  }

  static async assertSavedImages(item: StoredShoppingItem): Promise<void> {
    expect(item.syntheticInputs === true || item.sample === true).toBe(true)
    await StoreTryOnHarness.assertJpeg(item.garmentImageBase64)
    await StoreTryOnHarness.assertJpeg(item.previewImageBase64)
    expect(item.garmentImageBase64 === item.previewImageBase64).toBe(false)
  }

  static fingerprint(items: StoredShoppingItem[]): string {
    const checksum = (value: string): string => {
      let a = 1, b = 0
      for (let i = 0; i < value.length; i++) { a = (a + value.charCodeAt(i)) % 65521; b = (b + a) % 65521 }
      return value.length + ':' + b + ':' + a
    }
    return JSON.stringify(items.map(item => ({id: item.id, category: item.category, sample: item.sample,
      generatedByYouCam: item.generatedByYouCam, syntheticInputs: item.syntheticInputs,
      garment: checksum(item.garmentImageBase64), preview: checksum(item.previewImageBase64)})))
  }

  assertLiveConfigurationFromCache(): void {
    const raw = global.persistentStorageSystem.store.getString('StoreTryOn.previewProxy.v1')
    expect(raw.length > 0).toBe(true)
    let cached: {baseUrl?: unknown, accessToken?: unknown}
    try { cached = JSON.parse(raw) as {baseUrl?: unknown, accessToken?: unknown} }
    catch (_) { throw new Error('The preview proxy credential cache is unreadable.') }
    // Boolean assertions prevent LEAF from printing either credential on failure.
    expect(/^https:\/\//.test(this.main.proxyBaseUrl)).toBe(true)
    expect(this.main.proxyAccessToken.trim().length >= 32).toBe(true)
    expect(typeof cached.accessToken === 'string' && cached.accessToken === this.main.proxyAccessToken).toBe(true)
    expect(typeof cached.baseUrl === 'string' && cached.baseUrl === this.main.proxyBaseUrl).toBe(true)
  }

  checkpoint(kind: 'seeded' | 'cleared'): void {
    const items = this.requireSyntheticList()
    const checkpoint: Checkpoint = {kind, runtimeToken, count: items.length, fingerprint: StoreTryOnHarness.fingerprint(items)}
    global.persistentStorageSystem.store.putString(checkpointKey, JSON.stringify(checkpoint))
    expect(global.persistentStorageSystem.store.getString(checkpointKey)).toBe(JSON.stringify(checkpoint))
    print('[StoreTryOn LEAF] ' + kind + ' checkpoint saved; count=' + items.length + '. Reset preview before the matching verify scenario.')
  }

  async verifyCheckpoint(kind: 'seeded' | 'cleared'): Promise<void> {
    const raw = global.persistentStorageSystem.store.getString(checkpointKey)
    if (!raw) throw new Error('No LEAF checkpoint. Run persistence-seed or clear-confirm first, then reset preview.')
    const checkpoint = JSON.parse(raw) as Checkpoint
    expect(checkpoint.kind).toBe(kind)
    if (checkpoint.runtimeToken === runtimeToken) throw new Error('An actual preview reset is required between checkpoint and verification; same-runtime storage reads do not prove restart persistence.')
    const reloaded = this.requireSyntheticList()
    expect(reloaded.length).toBe(checkpoint.count)
    expect(StoreTryOnHarness.fingerprint(reloaded)).toBe(checkpoint.fingerprint)
    expect(this.main.getSnapshot().savedCount).toBe(checkpoint.count)
    expect(StoreTryOnHarness.fingerprint(this.main.state.items)).toBe(checkpoint.fingerprint)
    for (const item of reloaded) await StoreTryOnHarness.assertSavedImages(item)
    print('[StoreTryOn LEAF] Verified ' + kind + ' across a new preview runtime; count=' + reloaded.length + '. Hardware persistence remains unverified.')
  }
}

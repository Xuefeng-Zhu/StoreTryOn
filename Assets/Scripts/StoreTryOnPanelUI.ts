import {FlexLayout} from 'SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout'
import {FlexItem} from 'SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem'
import {FlexAlign, FlexAlignSelf, FlexDirection, FlexJustify} from 'SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes'
import {GridLayout} from 'SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Grid/GridLayout'
import {GridItem} from 'SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Grid/GridItem'
import {GridAlign} from 'SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Grid/GridTypes'
import {Frame} from 'SpectaclesUIKit.lspkg/Scripts/Components/Frame/Frame'
import {BackPlate} from 'SpectaclesUIKit.lspkg/Scripts/BackPlate'
import {Button} from 'SpectaclesUIKit.lspkg/Scripts/Components/Button/Button'
import {ElementContent} from 'SpectaclesUIKit.lspkg/Scripts/Components/Content/ElementContent'
import {ScrollWindow} from 'SpectaclesUIKit.lspkg/Scripts/Components/ScrollWindow/ScrollWindow'
import {RoundedRectangleVisual, RoundedRectangleVisualParameters} from 'SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangleVisual'
import Event from 'SpectaclesInteractionKit.lspkg/Utils/Event'
import {StoreTryOnSnapshot} from './StoreTryOnState'

export type StoreTryOnAction =
  | 'ShopperPhoto' | 'CaptureGarment' | 'TryOn' | 'AddToList' | 'Shirt' | 'Jacket'
  | 'ToggleMode' | 'ShoppingList' | 'Previous' | 'Next' | 'ClearList' | 'Back'
  | 'Continue' | 'RetakeShopper' | 'RetakeGarment' | 'TryAnother' | 'Settings'
  | 'CancelClear' | 'ConfirmClear' | 'ViewTryOn' | 'Retry' | 'NewVisit' | `OpenItem:${number}`
export interface StoreTryOnCard {
  index: number
  category: 'shirt' | 'jacket'
  image: Texture | null
  generatedByYouCam: boolean
  syntheticInputs: boolean
}

type TextRole = 'Title' | 'Heading' | 'Body' | 'Caption' | 'Button'
type PhotoRole = 'shopper' | 'garment' | 'preview' | 'savedGarment' | 'savedPreview' | 'card'
type PhotoBinding = {image: Image, role: PhotoRole, width: number, height: number, index?: number}
type FlexOptions = {gap?: number, padY?: number, padX?: number, justify?: FlexJustify, align?: FlexAlign}
type MutableLabel = {text: string}
const TYPE_SCALE: Record<TextRole, {size: number, weight: number}> = {
  Title: {size: 54, weight: 700}, Heading: {size: 48, weight: 700},
  Body: {size: 39, weight: 500}, Caption: {size: 38, weight: 500}, Button: {size: 39, weight: 500},
}
function applyTextRole(text: Text, role: TextRole): void {
  text.size = TYPE_SCALE[role].size
  ;(text as Text & {weight?: number}).weight = TYPE_SCALE[role].weight
}
const IMAGE_MATERIAL = requireAsset('../Materials/ImageMaterial.mat') as Material
const CAMERA = requireAsset('../Icons/photo_camera.png') as Texture
const GARMENT = requireAsset('../Icons/checkroom.png') as Texture
const BAG = requireAsset('../Icons/shopping_bag.png') as Texture
const PERSON = requireAsset('../Icons/person.png') as Texture
const DELETE = requireAsset('../Icons/delete.png') as Texture
const BACK = requireAsset('../Icons/arrow_back.png') as Texture
const LAYOUT_Z_LIFT = 0.02
const PAGE_GAP = 0.55

/** Passive UIKit view. Only the currently visible page owns controls/colliders. */
@component
export class StoreTryOnPanelUI extends BaseScriptComponent {
  @input @hint('Window content width in centimeters.') @widget(new SliderWidget(40, 46, 1))
  panelWidth: number = 44
  @input @hint('Window content height in centimeters.') @widget(new SliderWidget(50, 60, 1))
  panelHeight: number = 54
  @input @hint('Main text color for the optical display.') @widget(new ColorWidget())
  textColor: vec4 = new vec4(1, 1, 1, 1)
  @input @hint('Mint accent for headings, steps, and saved feedback.') @widget(new ColorWidget())
  accentColor: vec4 = new vec4(0.52, 0.92, 0.78, 1)
  @input @hint('Brand displayed in the window header.')
  title: string = 'StoreTryOn'

  readonly onAction = new Event<StoreTryOnAction>()
  ready = false
  private host: SceneObject | null = null
  private contentRoot: SceneObject | null = null
  private latest: StoreTryOnSnapshot | null = null
  private garment: Texture | null = null
  private shopper: Texture | null = null
  private preview: Texture | null = null
  private savedGarment: Texture | null = null
  private savedPreview: Texture | null = null
  private savedText = ''
  private cards: StoreTryOnCard[] = []
  private controls: Partial<Record<StoreTryOnAction, Button>> = {}
  private labels: Partial<Record<StoreTryOnAction, MutableLabel>> = {}
  private photos: PhotoBinding[] = []
  private activity: Text | null = null
  private status: Text | null = null
  private detailText: Text | null = null
  private collectionScroll: ScrollWindow | null = null
  private renderedKey = ''
  private rebuildPending = false
  private pendingAction: StoreTryOnAction | null = null
  private actionFramesRemaining = 0

  onAwake(): void {
    this.sceneObject.createComponent('Component.Canvas')
    const frame = this.sceneObject.createComponent(Frame.getTypeName()) as Frame
    frame.autoShowHide = false
    frame.autoScaleContent = false
    frame.allowScaling = false
    frame.onInitialized.add(() => {
      frame.showCloseButton = false
      frame.showFollowButton = true
      frame.innerSize = new vec2(this.panelWidth, this.panelHeight)
      frame.padding = new vec2(1, 1)
      this.host = frame.contentTransform.getSceneObject()
      this.ready = true
      this.rebuildPending = true
    })
    // SIK releases its trigger and then exits hover over successive frames.
    // Keep the pressed control alive through that sequence before navigating.
    this.createEvent('LateUpdateEvent').bind(() => {
      if (this.pendingAction && --this.actionFramesRemaining <= 0) {
        const action = this.pendingAction
        this.pendingAction = null
        this.onAction.invoke(action)
      }
      if (!this.pendingAction && this.ready && this.latest && this.rebuildPending) this.rebuild()
      if (this.activity && this.latest?.screen === 'generating') {
        const dots = ['·', '··', '···'][Math.floor(getTime() * 1.5) % 3]
        this.activity.text = 'Creating your look ' + dots
      }
    })
  }

  render(snapshot: StoreTryOnSnapshot, garment: Texture | null, shopper: Texture | null, preview: Texture | null): void {
    this.latest = snapshot
    this.garment = garment; this.shopper = shopper; this.preview = preview
    if (!this.ready) return
    if (this.pageKey(snapshot) !== this.renderedKey) this.queueRebuild()
    else this.updateView()
  }

  renderSaved(garment: Texture | null, preview: Texture | null, text: string): void {
    this.savedGarment = garment; this.savedPreview = preview; this.savedText = text
    if (this.latest?.screen === 'item' && !this.rebuildPending) this.updateView()
  }

  renderCollection(cards: StoreTryOnCard[]): void {
    const oldKey = this.collectionKey()
    this.cards = cards.slice()
    if (this.latest?.screen !== 'list') return
    if (oldKey !== this.collectionKey()) this.queueRebuild()
    else if (!this.rebuildPending) this.updateView()
  }

  getControl(action: StoreTryOnAction): SceneObject | null {
    const button = this.controls[action]
    if (this.pendingAction || this.rebuildPending || !button || button.inactive || !button.sceneObject.isEnabledInHierarchy || !button.interactable) return null
    if (action.startsWith('OpenItem:') && this.collectionScroll) {
      const position = this.collectionScroll.sceneObject.getTransform().getInvertedWorldTransform()
        .multiplyPoint(button.sceneObject.getTransform().getWorldPosition())
      const window = this.collectionScroll.windowSize
      if (Math.abs(position.y) + button.size.y / 2 > window.y / 2 || Math.abs(position.x) > window.x / 2) return null
    }
    return button.sceneObject
  }

  getCollectionScroll(): SceneObject | null {
    return !this.pendingAction && !this.rebuildPending && this.latest?.screen === 'list' && !this.latest.clearConfirmation
      ? this.collectionScroll?.sceneObject ?? null : null
  }

  private pageKey(snapshot: StoreTryOnSnapshot): string {
    return [snapshot.screen, snapshot.shopperReady, snapshot.previewReady, snapshot.savedCurrent, snapshot.clearConfirmation,
      snapshot.isEditor, snapshot.sampleMode, snapshot.useLiveApi, snapshot.serviceReady,
      snapshot.storageReady, snapshot.phase === 'generating',
      snapshot.errorAction ?? '', snapshot.phase === 'error', snapshot.selectedIndex,
      snapshot.screen === 'list' ? this.collectionKey() : ''].join('|')
  }
  private collectionKey(): string { return this.cards.map(card => card.index + ':' + card.category).join(',') }
  private queueRebuild(): void {
    this.rebuildPending = true
    if (!this.pendingAction) {
      for (const action of Object.keys(this.controls) as StoreTryOnAction[]) this.controls[action]!.inactive = true
    }
  }

  private rebuild(): void {
    const snapshot = this.latest!
    this.rebuildPending = false
    this.controls = {}; this.labels = {}; this.photos = []
    this.activity = null; this.status = null; this.detailText = null; this.collectionScroll = null
    if (this.contentRoot) this.contentRoot.destroy()
    this.contentRoot = this.obj(this.host!, 'StoreTryOn.Content', new vec3(0, 0, 0.6))
    const width = this.panelWidth - 2.4
    const outer = this.flexColumn(this.contentRoot, width, this.panelHeight - 1.6, {gap: PAGE_GAP})
    this.header(outer, width, snapshot)
    const badge = snapshot.sampleMode && snapshot.isEditor
    if (badge) this.sampleBadge(outer)
    const bodyHeight = this.panelHeight - 1.6 - 5.5 - PAGE_GAP - (badge ? 2 + PAGE_GAP : 0)
    const body = this.flexChild(outer, {w: width, h: bodyHeight}, () => {})
    const column = this.flexColumn(body, width, bodyHeight, {gap: PAGE_GAP})
    this.renderedKey = this.pageKey(snapshot)
    if (snapshot.clearConfirmation && snapshot.screen === 'list') this.clearPage(column, width)
    else switch (snapshot.screen) {
      case 'shopper': this.shopperPage(column, width, snapshot); break
      case 'garment': this.garmentPage(column, width, snapshot); break
      case 'review': this.reviewPage(column, width, snapshot); break
      case 'generating': this.generatingPage(column, width, snapshot); break
      case 'result': this.resultPage(column, width, snapshot); break
      case 'list': this.collectionPage(column, width, bodyHeight, snapshot); break
      case 'item': this.itemPage(column, width, snapshot); break
      case 'settings': this.settingsPage(column, width, snapshot); break
    }
    this.updateView()
  }

  private header(parent: SceneObject, width: number, snapshot: StoreTryOnSnapshot): void {
    this.flexChild(parent, {w: width, h: 5.5}, host => {
      const row = this.flexRow(host, width, 5.5, {gap: 0.6})
      this.button(row, 'Back', '', BACK, 5.5, 5.5, 'Ghost')
      this.text(row, this.title, 4, 'Title', this.textColor, width - (snapshot.isEditor ? 19.5 : 13.4))
      this.button(row, 'ShoppingList', String(snapshot.savedCount), BAG, 6.7, 5.5, 'Ghost')
      if (snapshot.isEditor) this.button(row, 'Settings', '', PERSON, 5.5, 5.5, 'Ghost')
    })
  }

  private shopperPage(parent: SceneObject, width: number, snapshot: StoreTryOnSnapshot): void {
    this.eyebrow(parent, '01  /  YOUR PHOTO')
    this.text(parent, snapshot.shopperReady ? 'A photo for this visit' : 'Find your next look', 3.1, 'Title')
    this.text(parent, snapshot.sampleMode
      ? 'Start with the sample shopper. Use the same photo for every garment.'
      : 'Photograph your full-body photo on another display. We reuse it this visit.', 3.5)
    this.photo(parent, 'shopper', 'StoreTryOn.ShopperPhotoCard', width, snapshot.phase === 'error' ? 17 : 23, PERSON)
    if (snapshot.phase === 'error') {
      this.feedback(parent, width, snapshot)
      return
    }
    if (snapshot.shopperReady) {
      this.row(parent, width, 6, row => {
        this.button(row, 'ShopperPhoto', snapshot.sampleMode ? 'Reload photo' : 'Retake photo', CAMERA, 15, 6, 'Secondary')
        this.button(row, 'Continue', 'Use this photo', PERSON, width - 16, 6, 'Primary')
      })
    } else this.button(parent, 'ShopperPhoto', snapshot.sampleMode ? 'Load sample photo' : 'Capture my photo', CAMERA, width, 6, 'Primary')
    this.feedback(parent, width, snapshot)
  }

  private garmentPage(parent: SceneObject, width: number, snapshot: StoreTryOnSnapshot): void {
    this.eyebrow(parent, '02  /  THE GARMENT')
    this.text(parent, 'What caught your eye?', 3.1, 'Title')
    this.categoryRow(parent, width, snapshot)
    this.photo(parent, 'garment', 'StoreTryOn.GarmentPhotoCard', width, snapshot.phase === 'error' ? 16 : 21, GARMENT)
    this.text(parent, 'One shirt or jacket, front facing and well lit.', 2.7, 'Caption')
    if (snapshot.phase !== 'error') this.button(parent, 'CaptureGarment', snapshot.sampleMode ? 'Load garment' : 'Capture garment', CAMERA, width, 6, 'Primary')
    this.feedback(parent, width, snapshot)
  }

  private reviewPage(parent: SceneObject, width: number, snapshot: StoreTryOnSnapshot): void {
    this.eyebrow(parent, '02  /  ' + (snapshot.category === 'shirt' ? 'SHIRT' : 'JACKET'))
    this.text(parent, 'Ready to try it on?', 3.1, 'Title')
    this.photo(parent, 'garment', 'StoreTryOn.GarmentPhotoCard', width, snapshot.phase === 'error' ? 16 : 23.5, GARMENT)
    this.text(parent, snapshot.useLiveApi
      ? 'Try it on sends these photos to YouCam and uses credits.'
      : 'Illustration mode · no API request will be made.', 3.1, 'Caption')
    this.row(parent, width, 6, row => {
      this.button(row, 'RetakeGarment', 'Retake', CAMERA, 12, 6, 'Secondary')
      this.button(row, 'TryOn', 'Try it on', GARMENT, width - 13, 6, 'Primary')
    })
    this.feedback(parent, width, snapshot)
  }

  private generatingPage(parent: SceneObject, width: number, snapshot: StoreTryOnSnapshot): void {
    this.eyebrow(parent, '03  /  YOUR TRY-ON')
    this.activity = this.text(parent, 'Creating your look ·', 3.1, 'Title', this.accentColor)
    this.photo(parent, 'garment', 'StoreTryOn.GarmentPhotoCard', width, 22, GARMENT)
    this.status = this.text(parent, snapshot.message || 'Your photos are being processed.', 4)
    this.text(parent, 'You can open your shopping list while we finish.', 3.5, 'Caption')
    this.text(parent, 'Your preview will appear here when it is ready.', 3, 'Caption')
  }

  private resultPage(parent: SceneObject, width: number, snapshot: StoreTryOnSnapshot): void {
    this.eyebrow(parent, '03  /  YOUR TRY-ON')
    this.text(parent, snapshot.savedCurrent ? 'A good find. Saved.' : 'How does it look?', 3.1, 'Title')
    this.text(parent, snapshot.previewFromLiveApi ? 'Generated by YouCam' : 'Illustration · not generated by YouCam', 2.1, 'Caption', this.accentColor)
    this.resultPhotos(parent, width, snapshot.phase === 'error' ? 17 : 23)
    if (snapshot.phase === 'error') {
      this.feedback(parent, width, snapshot)
      this.button(parent, 'TryAnother', 'Try another item', CAMERA, width, 5, 'Ghost')
      return
    }
    if (snapshot.savedCurrent) {
      this.text(parent, 'Added to your shopping list', 2.5, 'Body', this.accentColor)
      this.button(parent, 'TryAnother', 'Try another item', CAMERA, width, 6, 'Primary')
    } else {
      this.button(parent, 'AddToList', snapshot.phase === 'saving' ? 'Saving…' : 'Add to shopping list', BAG, width, 6, 'Primary')
      this.button(parent, 'TryAnother', 'Try another item', CAMERA, width, 5, 'Ghost')
    }
    this.feedback(parent, width, snapshot)
  }

  private collectionPage(parent: SceneObject, width: number, height: number, snapshot: StoreTryOnSnapshot): void {
    const needsAttention = snapshot.phase === 'error' && snapshot.shopperReady && snapshot.garmentReady && !snapshot.previewReady
    this.text(parent, 'Your shopping list', 3.1, 'Title')
    if (!snapshot.storageReady) {
      this.placeholder(parent, width, 13, BAG)
      this.text(parent, 'Saved list needs attention', 3.5, 'Heading')
      this.text(parent, 'The saved list could not be read. Clear it to start a new list.', 5)
      this.button(parent, 'ClearList', 'Reset saved list', DELETE, width, 6, 'Primary')
      return
    }
    if (!snapshot.savedCount) {
      this.placeholder(parent, width, 16, BAG)
      this.text(parent, needsAttention ? 'Your try-on could not finish. Open it to try again.' : 'Keep the pieces you want to come back to.', 4)
      if (snapshot.phase === 'generating') {
        this.text(parent, 'Your try-on is still being created.', 3, 'Caption', this.accentColor)
        this.button(parent, 'ViewTryOn', 'Back to your try-on', GARMENT, width, 6, 'Primary')
      } else if (snapshot.previewReady && !snapshot.savedCurrent) {
        this.button(parent, 'ViewTryOn', 'Your preview is ready', GARMENT, width, 6, 'Primary')
      } else if (needsAttention) {
        this.button(parent, 'ViewTryOn', 'Try-on needs attention', GARMENT, width, 6, 'Primary')
      } else this.button(parent, 'TryAnother', 'Find your first item', CAMERA, width, 6, 'Primary')
      this.text(parent, 'Your saved photos stay on this device until you clear them.', 3.5, 'Caption')
      return
    }
    const hasReadyResult = snapshot.previewReady && !snapshot.savedCurrent
    if (hasReadyResult) this.button(parent, 'ViewTryOn', 'Your preview is ready', GARMENT, width, 6, 'Primary')
    else if (snapshot.phase === 'generating') this.button(parent, 'ViewTryOn', 'Creating your try-on…', GARMENT, width, 6, 'Secondary')
    else if (needsAttention) this.button(parent, 'ViewTryOn', 'Try-on needs attention', GARMENT, width, 6, 'Primary')
    else this.text(parent, snapshot.savedCount + ' saved ' + (snapshot.savedCount === 1 ? 'piece' : 'pieces') + ' · on this device', 2, 'Caption', this.accentColor)
    const viewportHeight = height - 3.1 - (hasReadyResult || snapshot.phase === 'generating' || needsAttention ? 6 : 2) - 6 - PAGE_GAP * 3
    this.collection(parent, width, Math.max(22, viewportHeight))
    this.row(parent, width, 6, row => {
      this.button(row, 'TryAnother', 'Try another', CAMERA, width - 13, 6, 'Secondary')
      this.button(row, 'ClearList', 'Clear list', DELETE, 12, 6, 'Ghost')
    })
  }

  private itemPage(parent: SceneObject, width: number, snapshot: StoreTryOnSnapshot): void {
    this.eyebrow(parent, 'SAVED PIECE  /  ' + (snapshot.selectedIndex + 1) + ' OF ' + snapshot.savedCount)
    this.text(parent, 'Worth another look', 3.1, 'Title')
    this.row(parent, width, 25, row => {
      this.photo(row, 'savedGarment', 'StoreTryOn.GarmentPhotoCard', 13, 25, GARMENT)
      this.photo(row, 'savedPreview', 'StoreTryOn.TryOnPreviewCard', width - 14, 25, PERSON)
    })
    this.detailText = this.text(parent, this.savedText || 'Loading saved photos…', 4, 'Caption')
    this.row(parent, width, 5, row => {
      this.button(row, 'Previous', 'Previous', BACK, (width - 1) / 2, 5, 'Ghost')
      this.button(row, 'Next', 'Next', BAG, (width - 1) / 2, 5, 'Ghost')
    })
  }

  private settingsPage(parent: SceneObject, width: number, snapshot: StoreTryOnSnapshot): void {
    this.text(parent, 'Your visit', 3.1, 'Title')
    this.text(parent, 'The shopper photo is reused for each garment. Your shopping list stays saved separately.', 5)
    this.button(parent, 'RetakeShopper', 'Change shopper photo', PERSON, width, 6, 'Secondary')
    if (snapshot.isEditor) {
      this.text(parent, 'PREVIEW SETTINGS', 2, 'Caption', this.accentColor)
      if (!snapshot.serviceReady) this.text(parent, 'Live preview needs setup in the controller Inspector. Illustrations are available below.', 3.5, 'Caption')
      this.text(parent, snapshot.useLiveApi ? 'Live YouCam · sends sample photos and uses credits.' : 'Illustrations · no API requests or credits used.', 3.5)
      this.button(parent, 'ToggleMode', snapshot.useLiveApi ? 'Use illustrations' : 'Use live YouCam', GARMENT, width, 6, 'Secondary')
      this.button(parent, 'NewVisit', 'Start a new visit', CAMERA, width, 6, 'Ghost')
    }
    if (snapshot.useLiveApi && !snapshot.serviceReady) this.text(parent, 'Live try-on is unavailable right now.', 3, 'Caption')
  }

  private clearPage(parent: SceneObject, width: number): void {
    this.eyebrow(parent, 'YOUR SHOPPING LIST')
    this.text(parent, 'Clear your saved pieces?', 4, 'Title')
    this.placeholder(parent, width, 13, DELETE)
    this.text(parent, 'All saved garment and try-on photos will be removed from this device.', 5)
    this.text(parent, 'Your shopper photo for this visit stays ready.', 3, 'Caption')
    this.row(parent, width, 6, row => {
      this.button(row, 'CancelClear', 'Keep items', BACK, (width - 1) / 2, 6, 'Secondary')
      this.button(row, 'ConfirmClear', 'Clear list', DELETE, (width - 1) / 2, 6, 'Primary')
    })
  }

  private categoryRow(parent: SceneObject, width: number, snapshot: StoreTryOnSnapshot): void {
    this.row(parent, width, 5, row => {
      for (const category of ['shirt', 'jacket'] as const) {
        const action = category === 'shirt' ? 'Shirt' : 'Jacket'
        const button = this.button(row, action, category === 'shirt' ? 'Shirt' : 'Jacket', GARMENT, (width - 1) / 2, 5, 'Secondary')
        button.setIsToggleable(true)
        button.onInitialized.add(() => { button.isOn = this.latest?.category === category })
      }
    })
  }

  private resultPhotos(parent: SceneObject, width: number, height: number): void {
    this.row(parent, width, height, row => {
      this.flexChild(row, {w: 12, h: height}, cell => {
        const col = this.flexColumn(cell, 12, height, {gap: 0.6, justify: FlexJustify.Center})
        this.photo(col, 'garment', 'StoreTryOn.GarmentPhotoCard', 12, height - 4, GARMENT)
        this.text(col, 'The garment', 2.3, 'Caption', this.textColor, 12)
      })
      this.photo(row, 'preview', 'StoreTryOn.TryOnPreviewCard', width - 13, height, PERSON)
    })
  }

  private collection(parent: SceneObject, width: number, height: number): void {
    if (!this.cards.length) {
      this.placeholder(parent, width, height - 3.5, BAG)
      this.text(parent, 'Loading saved pieces…', 3, 'Caption')
      return
    }
    this.flexChild(parent, {w: width, h: height}, host => {
      host.name = 'StoreTryOn.CollectionScroll'
      const scroll = host.createComponent(ScrollWindow.getTypeName()) as ScrollWindow
      scroll.windowSize = new vec2(width, height)
      scroll.vertical = true; scroll.horizontal = false
      const cardHeight = 21.5, gap = 1.2
      const totalHeight = Math.max(height, Math.ceil(this.cards.length / 2) * (cardHeight + gap) - gap)
      scroll.scrollDimensions = new vec2(width, totalHeight)
      this.collectionScroll = scroll
      scroll.onInitialized.add(() => {
        scroll.scrollPositionNormalized = new vec2(0, 1)
        const content = this.obj(host, 'StoreTryOn.CollectionGrid')
        scroll.addObject(content)
        const grid = content.createComponent(GridLayout.getTypeName()) as GridLayout
        grid.onInitialized.add(() => {
          grid.width = width; grid.height = totalHeight
          grid.templateColumns = '1fr 1fr'; grid.templateRows = 'auto'
          grid.autoRows = 'auto'; grid.columnGap = gap; grid.rowGap = gap
          grid.justifyItems = GridAlign.Center; grid.alignItems = GridAlign.Center
          const items: GridItem[] = []
          for (const card of this.cards) {
            const cardObject = this.obj(content, 'StoreTryOn.CollectionCard:' + card.index)
            const item = cardObject.createComponent(GridItem.getTypeName()) as GridItem
            const cardWidth = (width - gap) / 2
            item.overrideWidth = cardWidth; item.overrideHeight = cardHeight; items.push(item)
            const backing = cardObject.createComponent(BackPlate.getTypeName()) as BackPlate
            backing.size = new vec2(cardWidth, cardHeight)
            const cardContent = this.obj(cardObject, 'CardContent', new vec3(0, 0, 0.6))
            const column = this.flexColumn(cardContent, cardWidth - 1.2, cardHeight - 1.2, {gap: 0.45, padY: 0.3})
            this.photo(column, 'card', 'StoreTryOn.CollectionPhotoCard', cardWidth - 2, 11.5, GARMENT, card.index)
            this.text(column, card.category === 'shirt' ? 'Shirt' : 'Jacket', 2.2, 'Heading', this.textColor, cardWidth - 2)
            const action: StoreTryOnAction = `OpenItem:${card.index}`
            this.button(column, action, 'View piece', BAG, cardWidth - 2, 5, 'Ghost')
          }
          grid.addItems(items)
          this.updateView()
        })
      })
    })
  }

  private photo(parent: SceneObject, role: PhotoRole, name: string, width: number, height: number, icon: Texture, index?: number): void {
    this.flexChild(parent, {w: width, h: height}, host => {
      host.name = name
      const picture = this.obj(host, role === 'card' ? 'StoreTryOn.CollectionThumbnail' : 'StoreTryOn.PhotoPixels')
      const image = this.makeImage(picture)
      image.enabled = false
      this.photos.push({image, role, width, height, index})
      if (role !== 'card') {
        const placeholder = this.obj(host, 'StoreTryOn.PhotoPlaceholder')
        const backing = placeholder.createComponent(BackPlate.getTypeName()) as BackPlate
        backing.size = new vec2(Math.min(width, 27), height)
        const glyph = this.obj(placeholder, 'StoreTryOn.PlaceholderGlyph', new vec3(0, 0, 0.7))
        const glyphImage = this.makeImage(glyph)
        glyphImage.mainPass.baseTex = icon
        glyph.getTransform().setLocalScale(new vec3(4, 4, 1))
      }
    })
  }

  private placeholder(parent: SceneObject, width: number, height: number, icon: Texture): void {
    this.flexChild(parent, {w: width, h: height}, host => {
      const child = this.obj(host, 'StoreTryOn.PlaceholderGlyph', new vec3(0, 0, 0.6))
      const image = this.makeImage(child)
      image.mainPass.baseTex = icon
      child.getTransform().setLocalScale(new vec3(6, 6, 1))
    })
  }

  private makeImage(object: SceneObject): Image {
    const image = object.createComponent('Component.Image') as Image
    const material = IMAGE_MATERIAL.clone()
    material.mainPass.depthTest = true; material.mainPass.depthWrite = false
    image.clearMaterials(); image.addMaterial(material)
    return image
  }

  private updateView(): void {
    const snapshot = this.latest
    if (!snapshot) return
    for (const binding of this.photos) {
      const texture = binding.role === 'shopper' ? this.shopper : binding.role === 'garment' ? this.garment
        : binding.role === 'preview' ? this.preview : binding.role === 'savedGarment' ? this.savedGarment
        : binding.role === 'savedPreview' ? this.savedPreview : this.cards.find(card => card.index === binding.index)?.image ?? null
      binding.image.enabled = texture !== null
      const placeholder = binding.image.sceneObject.getParent()!.children.find(child => child.name === 'StoreTryOn.PhotoPlaceholder')
      if (placeholder) placeholder.enabled = texture === null
      if (texture) {
        binding.image.mainPass.baseTex = texture
        const scale = Math.min(binding.width / texture.getWidth(), binding.height / texture.getHeight())
        binding.image.sceneObject.getTransform().setLocalScale(new vec3(texture.getWidth() * scale, texture.getHeight() * scale, 1))
      }
    }
    if (this.status) this.status.text = snapshot.message || 'We are preparing your preview.'
    if (this.detailText) this.detailText.text = this.savedText || 'Loading saved photos…'
    if (this.labels.ShoppingList) this.labels.ShoppingList.text = String(snapshot.savedCount)
    const navigation = ['Back', 'ShoppingList', 'ViewTryOn', 'Previous', 'Next', 'OpenItem:', 'ClearList', 'CancelClear', 'ConfirmClear']
    for (const action of Object.keys(this.controls) as StoreTryOnAction[]) {
      const button = this.controls[action]!
      const busyLocked = snapshot.busy && !(snapshot.phase === 'generating' && navigation.some(name => action === name || action.startsWith(name)))
      button.inactive = busyLocked
      if (action === 'Back') button.inactive = busyLocked || snapshot.screen === 'shopper'
      if (action === 'Continue') button.inactive = snapshot.busy || !snapshot.shopperReady
      if (action === 'TryOn') button.inactive = snapshot.busy || !snapshot.shopperReady || !snapshot.garmentReady || (snapshot.useLiveApi && !snapshot.serviceReady)
      if (action === 'AddToList') button.inactive = snapshot.busy || !snapshot.previewReady || snapshot.savedCurrent || !snapshot.storageReady
      if (action === 'Previous' || action === 'Next') button.inactive = busyLocked || snapshot.savedCount < 2
      if (snapshot.clearConfirmation && (action === 'Back' || action === 'ShoppingList' || action === 'Settings')) button.inactive = true
      if (action === 'Shirt' || action === 'Jacket') {
        if (button.initialized) button.isOn = snapshot.category === (action === 'Shirt' ? 'shirt' : 'jacket')
      }
    }
    if (this.labels.AddToList) this.labels.AddToList.text = snapshot.phase === 'saving' ? 'Saving…' : 'Add to shopping list'
  }

  private feedback(parent: SceneObject, width: number, snapshot: StoreTryOnSnapshot): void {
    if (snapshot.phase === 'error') {
      this.text(parent, snapshot.message || 'This step could not finish. Please try again.', 3.5, 'Caption')
      if (snapshot.errorAction) this.button(parent, 'Retry', 'Try again', BACK, width, 6, 'Primary')
    } else if (snapshot.useLiveApi && !snapshot.serviceReady && snapshot.screen === 'review') {
      this.text(parent, 'Try-on is unavailable right now. Please try again later.', 3.5, 'Caption')
    }
  }

  private eyebrow(parent: SceneObject, value: string): void { this.text(parent, value, 1.7, 'Caption', this.accentColor) }
  private sampleBadge(parent: SceneObject): void {
    this.flexChild(parent, {w: 13, h: 2}, host => {
      const backing = host.createComponent(BackPlate.getTypeName()) as BackPlate
      backing.size = new vec2(13, 2)
      const content = this.obj(host, 'SamplePhotoBadge', new vec3(0, 0, 0.6))
      const column = this.flexColumn(content, 13, 2)
      this.text(column, 'Sample photos', 2, 'Caption', this.accentColor, 13)
    })
  }
  private text(parent: SceneObject, value: string, height: number, role: TextRole = 'Body', color = this.textColor, width = this.panelWidth - 2.4): Text {
    let result!: Text
    this.flexChild(parent, {w: width, h: height}, child => {
      const text = child.createComponent('Component.Text') as Text
      text.text = value; text.depthTest = true; applyTextRole(text, role)
      text.textFill.color = color; text.horizontalAlignment = HorizontalAlignment.Center
      text.verticalAlignment = VerticalAlignment.Center; text.horizontalOverflow = HorizontalOverflow.Wrap
      text.verticalOverflow = VerticalOverflow.Overflow
      text.layoutRect = Rect.create(-width / 2, width / 2, -height / 2, height / 2)
      this.liftInZ(child, 0.15)
      result = text
    })
    return result
  }

  private button(parent: SceneObject, action: StoreTryOnAction, title: string, icon: Texture, width: number, height: number, style: 'Primary' | 'Secondary' | 'Ghost'): Button {
    let result!: Button
    this.flexChild(parent, {w: width, h: height}, host => {
      host.name = 'StoreTryOn.' + action
      const button = host.createComponent(Button.getTypeName()) as Button
      button.setVariant({theme: 'SnapOS3', shape: 'Capsule', style})
      button.size = new vec3(width, height, 1)
      let content: MutableLabel
      if (style === 'Primary') {
        const primaryStyle: Partial<RoundedRectangleVisualParameters> = {
          default: {baseType: 'Color', baseColor: new vec4(0.045, 0.20, 0.16, 1), hasBorder: true, borderType: 'Color', borderColor: this.accentColor, borderSize: 0.10},
          hovered: {baseType: 'Color', baseColor: new vec4(0.08, 0.32, 0.25, 1), hasBorder: true, borderType: 'Color', borderColor: new vec4(0.72, 1, 0.88, 1), borderSize: 0.13},
          triggered: {baseType: 'Color', baseColor: new vec4(0.04, 0.15, 0.12, 1), hasBorder: true, borderType: 'Color', borderColor: this.accentColor, borderSize: 0.10},
          inactive: {baseType: 'Color', baseColor: new vec4(0.08, 0.11, 0.10, 1), hasBorder: true, borderType: 'Color', borderColor: new vec4(0.3, 0.4, 0.35, 0.5), borderSize: 0.07},
        }
        const visual = new RoundedRectangleVisual({sceneObject: host, style: primaryStyle})
        visual.cornerRadius = height / 2
        button.visual = visual
        const face = this.obj(host, 'PrimaryActionContent', new vec3(0, 0, 0.12))
        const row = this.flexRow(face, width - 2, height, {gap: 0.65, justify: FlexJustify.Center, align: FlexAlign.Center})
        this.flexChild(row, {w: 2, h: 2}, cell => {
          const glyph = this.obj(cell, 'ActionIcon')
          const image = this.makeImage(glyph)
          image.mainPass.baseTex = icon
          glyph.getTransform().setLocalScale(new vec3(2, 2, 1))
        })
        content = this.text(row, title, 2.7, 'Button', new vec4(1, 1, 1, 1), width - 5)
        button.onStateChanged.add(() => {
          const text = content as Text
          text.textFill.color = button.inactive ? new vec4(1, 1, 1, 0.45) : new vec4(1, 1, 1, 1)
        })
      } else {
        const element = host.createComponent(ElementContent.getTypeName()) as ElementContent
        element.text = title; element.textSize = TYPE_SCALE.Button.size
        element.leadingIcon = icon; element.leadingIconSize = title ? 1.7 : 2.2
        element.spacing = 0.55; element.autoResize = false
        element.paddingLeft = 0.7; element.paddingRight = 0.7
        content = element
      }
      button.setTooltip(action === 'Settings' ? 'Preview settings' : action === 'ShoppingList' ? 'Shopping list' : action === 'Back' ? 'Back' : title)
      button.onTriggerUp.add(() => {
        if (button.inactive || this.rebuildPending || this.pendingAction) return
        this.pendingAction = action
        this.actionFramesRemaining = 3
      })
      this.controls[action] = button; this.labels[action] = content; result = button
    })
    return result
  }

  private row(parent: SceneObject, width: number, height: number, builder: (row: SceneObject) => void): void {
    this.flexChild(parent, {w: width, h: height}, child => builder(this.flexRow(child, width, height, {gap: 1, align: FlexAlign.Center})))
  }
  private obj(parent: SceneObject, name: string, position?: vec3): SceneObject {
    const object = global.scene.createSceneObject(name); object.setParent(parent)
    if (position) object.getTransform().setLocalPosition(position)
    return object
  }
  private liftInZ(object: SceneObject, amount: number): void {
    const transform = object.getTransform(), position = transform.getLocalPosition()
    transform.setLocalPosition(new vec3(position.x, position.y, position.z + amount))
  }
  private flexColumn(parent: SceneObject, width: number, height: number, options?: FlexOptions): SceneObject {
    return this.makeFlex(parent, FlexDirection.Column, width, height, options)
  }
  private flexRow(parent: SceneObject, width: number, height: number, options?: FlexOptions): SceneObject {
    return this.makeFlex(parent, FlexDirection.Row, width, height, options)
  }
  private makeFlex(parent: SceneObject, direction: FlexDirection, width: number, height: number, options?: FlexOptions): SceneObject {
    const object = this.obj(parent, 'Flex'); this.liftInZ(object, LAYOUT_Z_LIFT)
    const layout = object.createComponent(FlexLayout.getTypeName()) as FlexLayout
    layout.autoDiscoverItemsOnStart = false
    const item = object.createComponent(FlexItem.getTypeName()) as FlexItem
    if (width > 0) item.overrideWidth = width
    if (height > 0) item.overrideHeight = height
    layout.onInitialized.add(() => {
      layout.width = width; layout.height = height; layout.direction = direction
      if (direction === FlexDirection.Row) layout.columnGap = options?.gap ?? 0
      else layout.rowGap = options?.gap ?? 0
      layout.paddingTop = options?.padY ?? 0; layout.paddingBottom = options?.padY ?? 0
      layout.paddingLeft = options?.padX ?? 0; layout.paddingRight = options?.padX ?? 0
      layout.justifyContent = options?.justify ?? FlexJustify.Start
      layout.alignItems = options?.align ?? FlexAlign.Stretch
    })
    return object
  }
  private flexChild(parent: SceneObject, size: {w?: number, h?: number, grow?: number}, builder: (child: SceneObject) => void): SceneObject {
    const child = this.obj(parent, 'Item'); this.liftInZ(child, LAYOUT_Z_LIFT)
    const item = child.createComponent(FlexItem.getTypeName()) as FlexItem
    if (size.w !== undefined && size.w > 0) item.overrideWidth = size.w
    if (size.h !== undefined && size.h > 0) item.overrideHeight = size.h
    item.flexGrow = size.grow ?? 0; item.flexShrink = 0; item.alignSelf = FlexAlignSelf.Center
    builder(child)
    const layout = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (layout) layout.addItems([item])
    return child
  }
}

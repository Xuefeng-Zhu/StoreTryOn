import {FlexLayout} from 'SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout'
import {FlexItem} from 'SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem'
import {FlexAlign, FlexAlignSelf, FlexDirection, FlexJustify} from 'SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes'
import {Frame} from 'SpectaclesUIKit.lspkg/Scripts/Components/Frame/Frame'
import {Button} from 'SpectaclesUIKit.lspkg/Scripts/Components/Button/Button'
import {ElementContent} from 'SpectaclesUIKit.lspkg/Scripts/Components/Content/ElementContent'
import Event from 'SpectaclesInteractionKit.lspkg/Utils/Event'
import {StoreTryOnSnapshot} from './StoreTryOnState'

export type StoreTryOnAction = 'ShopperPhoto' | 'CaptureGarment' | 'TryOn' | 'AddToList' | 'Shirt' | 'Jacket' | 'ToggleMode' | 'ShoppingList' | 'Previous' | 'Next' | 'ClearList' | 'Back'
const imageMaterial = requireAsset('../Materials/ImageMaterial.mat') as Material
const CAMERA = requireAsset('../Icons/photo_camera.png') as Texture
const GARMENT = requireAsset('../Icons/checkroom.png') as Texture
const BAG = requireAsset('../Icons/shopping_bag.png') as Texture
const PERSON = requireAsset('../Icons/person.png') as Texture
const DELETE = requireAsset('../Icons/delete.png') as Texture
const BACK = requireAsset('../Icons/arrow_back.png') as Texture
const LAYOUT_Z_LIFT = 0.02
const TYPE_SCALE = {Title: {size: 62, weight: 700}, Body: {size: 39, weight: 500}, Caption: {size: 38, weight: 500}}
type TextRole = keyof typeof TYPE_SCALE

@component
export class StoreTryOnPanelUI extends BaseScriptComponent {
  @input @hint('Spatial window content width, in centimeters.') @widget(new SliderWidget(40, 48, 1))
  panelWidth: number = 46
  @input @hint('Spatial window content height, in centimeters.') @widget(new SliderWidget(58, 70, 1))
  panelHeight: number = 64
  @input @hint('White text is visible on the additive SPECS display.') @widget(new ColorWidget())
  textColor: vec4 = new vec4(1, 1, 1, 1)
  @input @hint('Accent color for status and sample labelling.') @widget(new ColorWidget())
  accentColor: vec4 = new vec4(0.52, 0.92, 0.78, 1)
  @input @hint('Window title.')
  title: string = 'StoreTryOn'

  readonly onAction = new Event<StoreTryOnAction>()
  private controls: Partial<Record<StoreTryOnAction, Button>> = {}
  private contentLabels: Partial<Record<StoreTryOnAction, ElementContent>> = {}
  private capturePage: SceneObject | null = null
  private listPage: SceneObject | null = null
  private pageLayout: FlexLayout | null = null
  private statusLabel: Text | null = null
  private modeLabel: Text | null = null
  private guideLabel: Text | null = null
  private garmentLabel: Text | null = null
  private resultLabel: Text | null = null
  private listTitle: Text | null = null
  private listStatus: Text | null = null
  private photos: Image[] = []
  private listPhotos: Image[] = []
  private latest: StoreTryOnSnapshot | null = null
  private latestTextures: (Texture | null)[] = [null, null]
  private latestSavedTextures: (Texture | null)[] = [null, null]
  private latestSavedText = 'No saved items yet.'
  ready = false

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
      this.build(frame.contentTransform.getSceneObject())
      this.ready = true
      if (this.latest) this.render(this.latest, this.latestTextures[0], this.latestTextures[1])
      this.renderSaved(this.latestSavedTextures[0], this.latestSavedTextures[1], this.latestSavedText)
    })
  }

  getControl(action: StoreTryOnAction): SceneObject | null {
    const button = this.controls[action]
    return button ? button.sceneObject : null
  }

  render(snapshot: StoreTryOnSnapshot, garment: Texture | null, resultOrShopper: Texture | null): void {
    this.latest = snapshot; this.latestTextures = [garment, resultOrShopper]
    if (!this.ready) return
    this.capturePage!.enabled = !snapshot.listOpen
    this.listPage!.enabled = snapshot.listOpen
    const captureItem = this.capturePage!.getComponent(FlexItem.getTypeName()) as FlexItem
    const listItem = this.listPage!.getComponent(FlexItem.getTypeName()) as FlexItem
    this.pageLayout!.removeItems([snapshot.listOpen ? captureItem : listItem])
    this.pageLayout!.addItems([snapshot.listOpen ? listItem : captureItem])
    this.modeLabel!.text = snapshot.useLiveApi
      ? (snapshot.sampleMode ? 'LIVE YOUCAM · SAMPLE PHOTOS · uses credits' : 'LIVE YOUCAM · CAMERA PHOTOS · uses credits')
      : 'SAMPLE MODE · illustrations · no API requests'
    this.guideLabel!.text = snapshot.sampleMode
      ? (snapshot.useLiveApi
        ? 'Load sample photos. Try it on sends them to YouCam and uses credits.'
        : 'Load a sample shopper photo and garment. Illustrations use no API.')
      : (snapshot.shopperReady
        ? 'Your photo is reused this visit. Try it on sends both photos to YouCam.'
        : 'Capture your full-body photo from another display. Try-on sends photos to YouCam.')
    this.statusLabel!.text = snapshot.message
    this.garmentLabel!.text = snapshot.garmentReady ? (snapshot.category === 'shirt' ? 'Shirt' : 'Jacket') : 'Garment photo'
    this.resultLabel!.text = snapshot.previewReady
      ? (snapshot.previewFromLiveApi ? 'YouCam try-on preview' : 'Illustration · NOT YouCam')
      : (snapshot.sampleMode ? 'Sample shopper photo' : 'Your photo · this visit')
    this.contentLabels.ShopperPhoto!.text = snapshot.sampleMode
      ? (snapshot.shopperReady ? 'Reload sample photo' : 'Load sample photo')
      : (snapshot.shopperReady ? 'Replace my photo' : 'Capture my photo')
    this.contentLabels.CaptureGarment!.text = snapshot.sampleMode ? 'Load garment' : 'Capture garment'
    this.contentLabels.ToggleMode!.text = snapshot.isEditor
      ? (snapshot.useLiveApi ? 'Use illustrations' : 'Use live YouCam')
      : (snapshot.sampleMode ? 'Use live camera' : 'Use sample demo')
    this.contentLabels.TryOn!.text = snapshot.phase === 'error' ? 'Retry try-on' : 'Try it on'
    this.contentLabels.ShoppingList!.text = 'Shopping list (' + snapshot.savedCount + ')'
    this.contentLabels.Shirt!.text = (snapshot.category === 'shirt' ? '✓ ' : '') + 'Shirt'
    this.contentLabels.Jacket!.text = (snapshot.category === 'jacket' ? '✓ ' : '') + 'Jacket'
    this.controls.TryOn!.opacity = snapshot.busy || !snapshot.shopperReady || !snapshot.garmentReady ? 0.45 : 1
    this.controls.CaptureGarment!.opacity = snapshot.busy ? 0.45 : 1
    this.controls.AddToList!.opacity = snapshot.previewReady && !snapshot.busy ? 1 : 0.45
    this.setImage(this.photos[0], garment)
    this.setImage(this.photos[1], resultOrShopper)
    this.listTitle!.text = snapshot.savedCount ? 'Shopping list · ' + (snapshot.selectedIndex + 1) + ' / ' + snapshot.savedCount : 'Shopping list · empty'
  }

  renderSaved(garment: Texture | null, preview: Texture | null, text: string): void {
    this.latestSavedTextures = [garment, preview]
    this.latestSavedText = text
    if (!this.ready) return
    this.setImage(this.listPhotos[0], garment)
    this.setImage(this.listPhotos[1], preview)
    this.listStatus!.text = text
  }

  private build(host: SceneObject): void {
    const root = this.obj(host, 'StoreTryOn.Content', new vec3(0, 0, 0.6))
    const outer = this.flexColumn(root, this.panelWidth, this.panelHeight, {gap: 0.6, padX: 1, padY: 0.7})
    this.pageLayout = outer.getComponent(FlexLayout.getTypeName()) as FlexLayout
    this.addText(outer, this.title, 3.2, 'Title')
    this.modeLabel = this.addText(outer, 'SAMPLE MODE', 2.4, 'Caption', this.accentColor)
    this.capturePage = this.flexChild(outer, {w: this.panelWidth - 2, h: 54.5}, page => {
      const col = this.flexColumn(page, this.panelWidth - 2, 54.5, {gap: 0.4})
      this.guideLabel = this.addText(col, 'Capture your photo once for this visit.', 3)
      this.actionRow(col, [
        ['ShopperPhoto', 'Capture my photo', PERSON], ['ToggleMode', 'Use live camera', CAMERA],
      ], 5)
      this.actionRow(col, [['Shirt', '✓ Shirt', GARMENT], ['Jacket', 'Jacket', GARMENT]], 4)
      const labels = this.flexChild(col, {w: 44, h: 2.2}, row => {
        const flex = this.flexRow(row, 44, 2.2, {gap: 1})
        this.garmentLabel = this.addText(flex, 'Garment photo', 2.2, 'Caption', this.textColor, 21.5)
        this.resultLabel = this.addText(flex, 'Your photo · this visit', 2.2, 'Caption', this.textColor, 21.5)
      })
      labels.name = 'StoreTryOn.PhotoLabels'
      this.photoPair(col, this.photos)
      this.statusLabel = this.addText(col, 'Start with your photo.', 3.5)
      this.actionRow(col, [['CaptureGarment', 'Capture garment', CAMERA], ['TryOn', 'Try it on', GARMENT]], 6)
      this.actionRow(col, [['AddToList', 'Add to shopping list', BAG]], 5.5)
      this.actionRow(col, [['ShoppingList', 'Shopping list (0)', BAG]], 5)
    })
    this.listPage = this.flexChild(outer, {w: this.panelWidth - 2, h: 54.5}, page => {
      const col = this.flexColumn(page, this.panelWidth - 2, 54.5, {gap: 1})
      this.listTitle = this.addText(col, 'Shopping list · empty', 3.5, 'Title')
      this.addText(col, 'Saved on this device until you clear the list.', 3)
      this.actionRow(col, [['Back', 'Back to capture', BACK]], 5)
      this.photoPair(col, this.listPhotos)
      this.listStatus = this.addText(col, 'No saved items yet.', 5)
      this.actionRow(col, [['Previous', 'Previous', BACK], ['Next', 'Next', BAG]], 5)
      this.actionRow(col, [['ClearList', 'Clear list', DELETE]], 5)
      this.addText(col, 'Saved previews include your likeness. Clear removes local images.', 4, 'Caption')
    })
    this.listPage.enabled = false
    this.pageLayout.removeItems([this.listPage.getComponent(FlexItem.getTypeName()) as FlexItem])
  }

  private actionRow(parent: SceneObject, actions: [StoreTryOnAction, string, Texture][], height: number): void {
    const width = this.panelWidth - 2
    this.flexChild(parent, {w: width, h: height}, row => {
      const flex = this.flexRow(row, width, height, {gap: 1})
      const w = (width - actions.length + 1) / actions.length
      for (const [action, label, icon] of actions) this.flexChild(flex, {w, h: height}, obj => {
        obj.name = 'StoreTryOn.' + action
        const button = obj.createComponent(Button.getTypeName()) as Button
        ;(button as any)._styleSnapOS2 = action === 'AddToList' ? 'Primary' : 'PrimaryNeutral'
        ;(button as any)._styleSnapOS3 = action === 'AddToList' ? 'Primary' : 'Secondary'
        ;(button as any)._shapeSnapOS2 = 'Capsule'
        ;(button as any)._shapeSnapOS3 = 'Capsule'
        button.size = new vec3(w, height, 1)
        const content = obj.createComponent(ElementContent.getTypeName()) as ElementContent
        content.text = label; content.textSize = TYPE_SCALE.Body.size
        content.leadingIcon = icon; content.leadingIconSize = 1.7
        content.spacing = 0.5; content.autoResize = false
        content.paddingLeft = 0.8; content.paddingRight = 0.8
        button.onTriggerUp.add(() => this.onAction.invoke(action))
        this.controls[action] = button; this.contentLabels[action] = content
      })
    })
  }

  private photoPair(parent: SceneObject, targets: Image[]): void {
    this.flexChild(parent, {w: this.panelWidth - 2, h: 16}, host => {
      const row = this.flexRow(host, this.panelWidth - 2, 16, {gap: 1, align: FlexAlign.Center})
      for (let i = 0; i < 2; i++) this.flexChild(row, {w: 21.5, h: 16}, child => {
        child.name = 'StoreTryOn.Photo' + i
        const imageObject = this.obj(child, 'StoreTryOn.PhotoPixels')
        const image = imageObject.createComponent('Component.Image') as Image
        const material = imageMaterial.clone()
        material.mainPass.depthTest = true; material.mainPass.depthWrite = false
        image.clearMaterials(); image.addMaterial(material)
        image.enabled = false
        imageObject.getTransform().setLocalScale(new vec3(21.5, 16, 1))
        targets.push(image)
      })
    })
  }

  private setImage(image: Image, texture: Texture | null): void {
    image.enabled = texture !== null
    if (!texture) return
    image.mainPass.baseTex = texture
    const w = texture.getWidth(), h = texture.getHeight()
    const scale = Math.min(21.5 / w, 16 / h)
    image.sceneObject.getTransform().setLocalScale(new vec3(w * scale, h * scale, 1))
  }

  private addText(parent: SceneObject, value: string, height: number, role: TextRole = 'Body', color = this.textColor, width = this.panelWidth - 2): Text {
    let result!: Text
    this.flexChild(parent, {w: width, h: height}, child => {
      const text = child.createComponent('Component.Text') as Text
      text.text = value; text.depthTest = true
      text.size = TYPE_SCALE[role].size
      ;(text as Text & {weight?: number}).weight = TYPE_SCALE[role].weight
      text.textFill.color = color
      text.horizontalAlignment = HorizontalAlignment.Center
      text.verticalAlignment = VerticalAlignment.Center
      text.horizontalOverflow = HorizontalOverflow.Wrap
      text.verticalOverflow = VerticalOverflow.Overflow
      text.layoutRect = Rect.create(-width / 2, width / 2, -height / 2, height / 2)
      this.liftInZ(child, 0.15)
      result = text
    })
    return result
  }

  private obj(parent: SceneObject, name: string, position?: vec3): SceneObject {
    const sceneObject = global.scene.createSceneObject(name)
    sceneObject.setParent(parent)
    if (position) sceneObject.getTransform().setLocalPosition(position)
    return sceneObject
  }
  private liftInZ(sceneObject: SceneObject, zOffset: number): void {
    const transform = sceneObject.getTransform(), pos = transform.getLocalPosition()
    transform.setLocalPosition(new vec3(pos.x, pos.y, pos.z + zOffset))
  }
  private flexColumn(parent: SceneObject, width: number, height: number, opts?: {gap?: number, padY?: number, padX?: number, justify?: FlexJustify, align?: FlexAlign}): SceneObject {
    return this.makeFlex(parent, FlexDirection.Column, width, height, opts)
  }
  private flexRow(parent: SceneObject, width: number, height: number, opts?: {gap?: number, padY?: number, padX?: number, justify?: FlexJustify, align?: FlexAlign}): SceneObject {
    return this.makeFlex(parent, FlexDirection.Row, width, height, opts)
  }
  private makeFlex(parent: SceneObject, direction: FlexDirection, width: number, height: number, opts?: {gap?: number, padY?: number, padX?: number, justify?: FlexJustify, align?: FlexAlign}): SceneObject {
    const container = this.obj(parent, 'Flex')
    this.liftInZ(container, LAYOUT_Z_LIFT)
    const layout = container.createComponent(FlexLayout.getTypeName()) as FlexLayout
    layout.autoDiscoverItemsOnStart = false
    const item = container.createComponent(FlexItem.getTypeName()) as FlexItem
    if (width > 0) item.overrideWidth = width
    if (height > 0) item.overrideHeight = height
    layout.onInitialized.add(() => {
      layout.width = width; layout.height = height; layout.direction = direction
      if (direction === FlexDirection.Row) layout.columnGap = opts?.gap ?? 0
      else layout.rowGap = opts?.gap ?? 0
      layout.paddingTop = opts?.padY ?? 0; layout.paddingBottom = opts?.padY ?? 0
      layout.paddingLeft = opts?.padX ?? 0; layout.paddingRight = opts?.padX ?? 0
      layout.justifyContent = opts?.justify ?? FlexJustify.Start
      layout.alignItems = opts?.align ?? FlexAlign.Stretch
    })
    return container
  }
  private flexChild(parent: SceneObject, size: {w?: number, h?: number, grow?: number}, builder: (childObject: SceneObject) => void): SceneObject {
    const child = this.obj(parent, 'Item')
    this.liftInZ(child, LAYOUT_Z_LIFT)
    const item = child.createComponent(FlexItem.getTypeName()) as FlexItem
    if (size.w !== undefined && size.w > 0) item.overrideWidth = size.w
    if (size.h !== undefined && size.h > 0) item.overrideHeight = size.h
    item.flexGrow = size.grow ?? 0; item.flexShrink = 0
    item.alignSelf = FlexAlignSelf.Center
    builder(child)
    const layout = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (layout) layout.addItems([item])
    return child
  }
}

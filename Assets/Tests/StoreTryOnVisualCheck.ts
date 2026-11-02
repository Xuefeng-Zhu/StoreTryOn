import {Scenario} from 'Leaf.lspkg/Scenarios/scenario/Scenario'
import {ScenarioConfig} from 'Leaf.lspkg/Scenarios/scenario/ScenarioConfig'
import {expect} from 'Leaf.lspkg/Utils/common/Expect'
import {StoreTryOnHarness} from './StoreTryOnHarness'
import {findSceneObjectByName, sleep} from 'Leaf.lspkg/Utils/common/Utils'

/** Leaves a real guided UI state for screenshots; never requests the provider. */
@component
export class StoreTryOnVisualCheck extends Scenario {
  async run(config?: ScenarioConfig): Promise<void> {
    const wanted = config?.get('screen') || 'shopper'
    const valid = ['shopper', 'shopper-review', 'garment', 'review', 'generating', 'result', 'list', 'item', 'settings', 'clear', 'error', 'walkthrough']
    if (!valid.includes(wanted)) throw new Error('Unknown visual-check screen.')
    const h = await StoreTryOnHarness.open()
    const debugOverlay = findSceneObjectByName('LeafDebugUICamera')
    if (debugOverlay) debugOverlay.enabled = false
    await h.freshVisit()
    if (wanted === 'walkthrough') {
      await this.walkthrough(h)
      return
    }
    if (wanted === 'shopper-review' || wanted === 'garment') {
      await h.tap('ShopperPhoto')
      if (wanted === 'garment') await h.tap('Continue')
    } else if (wanted === 'review' || wanted === 'generating') {
      await h.reviewGarment('shirt')
      if (wanted === 'generating') {
        await h.press('TryOn')
        await h.until(() => h.main.getSnapshot().phase === 'generating', 'visual generation starts')
        expect(h.main.getSnapshot().phase).toBe('generating')
      }
    } else if (wanted === 'result') await h.shirtResult()
    else if (wanted === 'list' || wanted === 'item' || wanted === 'clear') {
      await h.ensureSavedSample()
      await h.openList()
      if (wanted === 'item') await h.openItem(0)
      else if (wanted === 'clear') await h.tap('ClearList')
    } else if (wanted === 'settings') await h.settings()
    else if (wanted === 'error') {
      const fixture = h.main.sampleShopper
      if (!fixture) throw new Error('Shopper fixture is missing.')
      try {
        h.main.sampleShopper = null
        await h.tap('ShopperPhoto')
        expect(h.main.getSnapshot().phase).toBe('error')
      } finally { h.main.sampleShopper = fixture }
    }
    expect(h.main.getSnapshot().useLiveApi).toBe(false)
    print('[StoreTryOn LEAF] Visual state ' + JSON.stringify({requested: wanted,
      screen: h.main.getSnapshot().screen, phase: h.main.getSnapshot().phase, providerRequested: false,
      transient: wanted === 'generating'}))
    // Generating is an actual short-lived operation, not a held/faked screen.
    // Capture it in flight; this scenario cannot promise it remains after return.
  }

  private async capture(stage: string): Promise<void> {
    print('[StoreTryOn UX CAPTURE] stage=' + stage)
    await sleep(4000)
  }

  private async walkthrough(h: StoreTryOnHarness): Promise<void> {
    h.requireCapacity(1)
    expect(h.main.getSnapshot().useLiveApi).toBe(false)
    const before = h.main.getSnapshot().savedCount
    await this.capture('shopper')
    await h.tap('ShopperPhoto')
    await h.until(() => h.canActivate('Continue'), 'shopper review')
    await this.capture('shopper-review')
    await h.tap('Continue')
    await h.screen('garment')
    if (h.main.getSnapshot().category !== 'shirt') await h.tap('Shirt')
    await this.capture('garment')
    await h.tap('CaptureGarment')
    await h.screen('review')
    await this.capture('review')
    await h.tap('TryOn')
    await h.screen('result')
    expect(h.main.getSnapshot().previewFromLiveApi).toBe(false)
    await this.capture('result')
    await h.tap('AddToList')
    await h.until(() => h.main.getSnapshot().savedCurrent, 'walkthrough look saves')
    expect(h.main.getSnapshot().savedCount).toBe(before + 1)
    await this.capture('saved')
    const fingerprint = StoreTryOnHarness.fingerprint(h.main.getSavedItems())
    await h.openList()
    await this.capture('list')
    await h.openItem(0)
    await this.capture('item')
    await h.tap('Back')
    await h.screen('list')
    h.requireSyntheticList()
    await h.tap('ClearList')
    expect(h.main.getSnapshot().clearConfirmation).toBe(true)
    await this.capture('clear')
    await h.tap('CancelClear')
    expect(StoreTryOnHarness.fingerprint(h.main.getSavedItems())).toBe(fingerprint)
    await h.tap('Back')
    await h.screen('result')
    await h.settings()
    await this.capture('settings')
    await h.tap('Back')
    await h.screen('result')
    await h.tap('TryAnother')
    await h.screen('garment')
    await h.tap('Back')
    await h.screen('shopper')
    const fixture = h.main.sampleShopper
    const retainedShopper = h.main.state.shopper
    if (!fixture) throw new Error('Shopper fixture is required for the walkthrough error state.')
    try {
      h.main.sampleShopper = null
      await h.press('ShopperPhoto')
      await h.until(() => h.main.getSnapshot().phase === 'error', 'walkthrough capture error')
      expect(h.main.getSnapshot().errorAction).toBe('ShopperPhoto')
      expect(h.main.state.shopper === retainedShopper).toBe(true)
    } finally { h.main.sampleShopper = fixture }
    await this.capture('error')
    expect(h.main.getSnapshot().useLiveApi).toBe(false)
    expect(h.main.getSnapshot().savedCount).toBe(before + 1)
    expect(StoreTryOnHarness.fingerprint(h.main.getSavedItems())).toBe(fingerprint)
    print('[StoreTryOn LEAF] Guided visual walkthrough complete; one synthetic look saved, clear cancelled, fixture restored, no provider request.')
  }
}

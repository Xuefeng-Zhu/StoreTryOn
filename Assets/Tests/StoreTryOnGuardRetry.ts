import {Scenario} from 'Leaf.lspkg/Scenarios/scenario/Scenario'
import {expect} from 'Leaf.lspkg/Utils/common/Expect'
import {StoreTryOnHarness} from './StoreTryOnHarness'

@component
export class StoreTryOnGuardRetry extends Scenario {
  async run(): Promise<void> {
    const h = await StoreTryOnHarness.open()
    h.requireCapacity(1)
    const before = h.main.getSnapshot().savedCount
    await h.freshVisit()
    expect(h.canActivate('Continue')).toBe(false)
    expect(h.canActivate('TryOn')).toBe(false)
    expect(h.canActivate('AddToList')).toBe(false)
    const shopperFixture = h.main.sampleShopper
    if (!shopperFixture) throw new Error('Shopper fixture is required for capture-failure recovery.')
    try {
      h.main.sampleShopper = null
      await h.tap('ShopperPhoto')
      expect(h.main.getSnapshot().phase).toBe('error')
      expect(h.main.getSnapshot().screen).toBe('shopper')
      expect(h.main.getSnapshot().errorAction).toBe('ShopperPhoto')
      expect(h.main.getSnapshot().shopperReady).toBe(false)
      expect(h.canActivate('Retry')).toBe(true)
    } finally { h.main.sampleShopper = shopperFixture }
    await h.tap('Retry')
    expect(h.main.getSnapshot().shopperReady).toBe(true)
    expect(h.main.getSnapshot().errorAction).toBeNull()
    await h.tap('Continue')
    await h.screen('garment')
    expect(h.canActivate('TryOn')).toBe(false)
    if (h.main.getSnapshot().category !== 'shirt') await h.tap('Shirt')
    await h.tap('CaptureGarment')
    await h.screen('review')
    const previousGarment = h.main.state.garment
    const garmentFixture = h.main.sampleShirt
    if (!garmentFixture) throw new Error('Shirt fixture is required for retake recovery.')
    await h.tap('RetakeGarment')
    await h.screen('garment')
    try {
      h.main.sampleShirt = null
      await h.tap('CaptureGarment')
      expect(h.main.getSnapshot().phase).toBe('error')
      expect(h.main.getSnapshot().errorAction).toBe('CaptureGarment')
      expect(h.main.state.garment === previousGarment).toBe(true)
      expect(h.main.getSnapshot().previewReady).toBe(false)
    } finally { h.main.sampleShirt = garmentFixture }
    await h.tap('Retry')
    await h.screen('review')
    await h.tap('TryOn')
    await h.screen('result')
    expect(h.main.getSnapshot().previewReady).toBe(true)
    expect(h.main.getSnapshot().useLiveApi).toBe(false)
    expect(h.main.getSnapshot().savedCount).toBe(before)
    const existing = h.main.getSavedItems()
    const fingerprint = StoreTryOnHarness.fingerprint(existing)
    const preview = h.main.state.preview
    const maximum = h.main.maxItems
    try {
      h.main.maxItems = before
      await h.press('AddToList')
      await h.until(() => h.main.getSnapshot().phase === 'error' && h.main.getSnapshot().errorAction === 'AddToList', 'capacity error')
      expect(h.main.getSnapshot().screen).toBe('result')
      expect(h.main.getSnapshot().previewReady).toBe(true)
      expect(h.main.state.preview === preview).toBe(true)
      expect(h.main.getSnapshot().savedCurrent).toBe(false)
      expect(h.main.getSnapshot().savedCount).toBe(before)
      expect(StoreTryOnHarness.fingerprint(h.main.getSavedItems())).toBe(fingerprint)
      await h.until(() => h.canActivate('Retry'), 'capacity recovery control')
    } finally { h.main.maxItems = maximum }
    await h.press('Retry')
    await h.until(() => h.main.getSnapshot().savedCurrent, 'capacity recovery saves the retained result')
    expect(h.main.getSnapshot().phase).toBe('result')
    expect(h.main.getSnapshot().savedCount).toBe(before + 1)
    const after = h.main.getSavedItems()
    expect(StoreTryOnHarness.fingerprint(after.slice(0, before))).toBe(fingerprint)
    const added = after[after.length - 1]
    expect(added.sample).toBe(true)
    expect(added.generatedByYouCam).toBe(false)
    expect(added.syntheticInputs).toBe(true)
    await StoreTryOnHarness.assertSavedImages(added)
    print('[StoreTryOn LEAF] Capture and capacity Retry passed; failed retake/save retained photos and existing entries; exactly one synthetic item saved, no API request.')
  }
}

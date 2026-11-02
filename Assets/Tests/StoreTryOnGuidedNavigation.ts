import {Scenario} from 'Leaf.lspkg/Scenarios/scenario/Scenario'
import {expect} from 'Leaf.lspkg/Utils/common/Expect'
import {StoreTryOnHarness} from './StoreTryOnHarness'

@component
export class StoreTryOnGuidedNavigation extends Scenario {
  async run(): Promise<void> {
    const h = await StoreTryOnHarness.open()
    const count = h.main.getSnapshot().savedCount
    await h.freshVisit()
    expect(h.canActivate('TryOn')).toBe(false)
    expect(h.canActivate('Continue')).toBe(false)
    await h.tap('ShopperPhoto')
    await h.until(() => h.canActivate('Continue'), 'shopper review')
    h.assertPhotoRole('StoreTryOn.ShopperPhotoCard')
    const shopper = h.main.state.shopper
    await h.tap('Continue')
    await h.screen('garment')
    await h.tap('Back')
    await h.screen('shopper')
    expect(h.main.state.shopper === shopper).toBe(true)
    await h.tap('Continue')
    await h.reviewGarment('shirt')
    const garment = h.main.state.garment
    await h.tap('RetakeGarment')
    await h.screen('garment')
    expect(h.main.state.garment === garment).toBe(true)
    expect(h.main.state.shopper === shopper).toBe(true)
    await h.tap('CaptureGarment')
    await h.screen('review')
    await h.tap('TryOn')
    await h.screen('result')
    await h.settings()
    await h.tap('ToggleMode')
    expect(h.main.getSnapshot().useLiveApi).toBe(true)
    expect(h.main.getSnapshot().previewReady).toBe(false)
    expect(h.main.state.shopper === shopper).toBe(true)
    expect(h.main.state.garment === garment).toBe(true)
    await h.tap('Back')
    await h.screen('review')
    // Selecting live mode does not itself upload or generate. Return to the
    // free path before any TryOn action; source inputs remain the same.
    await h.settings()
    await h.tap('ToggleMode')
    await h.tap('Back')
    await h.screen('review')
    expect(h.main.getSnapshot().useLiveApi).toBe(false)
    expect(h.main.getSnapshot().savedCount).toBe(count)
    print('[StoreTryOn LEAF] Guided Back/retake preserved inputs; settings invalidated result and returned to review; no API request.')
  }
}

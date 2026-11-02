import {Scenario} from 'Leaf.lspkg/Scenarios/scenario/Scenario'
import {expect} from 'Leaf.lspkg/Utils/common/Expect'
import {StoreTryOnHarness} from './StoreTryOnHarness'

@component
export class StoreTryOnBackgroundGeneration extends Scenario {
  async run(): Promise<void> {
    const h = await StoreTryOnHarness.open()
    await h.freshVisit()
    await h.reviewGarment('shirt')
    const before = h.main.getSnapshot().savedCount
    const revision = h.main.state.captureRevision
    const fingerprint = StoreTryOnHarness.fingerprint(h.main.getSavedItems())
    await h.press('TryOn')
    await h.until(() => h.main.getSnapshot().phase === 'generating', 'generation starts')
    expect(h.main.getSnapshot().phase).toBe('generating')
    expect(h.main.getSnapshot().screen).toBe('generating')
    expect(h.canActivate('TryOn')).toBe(false)
    expect(h.canActivate('CaptureGarment')).toBe(false)
    await h.press('ShoppingList')
    await h.screen('list')
    expect(h.main.getSnapshot().phase).toBe('generating')
    await h.idle()
    expect(h.main.getSnapshot().screen).toBe('list')
    expect(h.main.getSnapshot().previewReady).toBe(true)
    expect(h.main.getSnapshot().previewFromLiveApi).toBe(false)
    expect(h.main.state.captureRevision).toBe(revision)
    expect(h.main.getSnapshot().savedCount).toBe(before)
    await h.tap('ViewTryOn')
    await h.screen('result')
    h.assertPhotoRole('StoreTryOn.TryOnPreviewCard')
    await h.tap('TryAnother')
    await h.reviewGarment('shirt')
    const fixture = h.main.sampleShirtPreview
    if (!fixture) throw new Error('Illustration fixture is required for the background-error recovery check.')
    try {
      h.main.sampleShirtPreview = null
      await h.press('TryOn')
      await h.until(() => h.main.getSnapshot().phase === 'generating', 'background failure generation starts')
      await h.press('ShoppingList')
      await h.screen('list')
      await h.until(() => h.main.getSnapshot().phase === 'error', 'background generation reports its error')
      expect(h.main.getSnapshot().screen).toBe('list')
      expect(h.main.getSnapshot().errorAction).toBe('TryOn')
      expect(h.main.getSnapshot().previewReady).toBe(false)
      expect(h.main.getSnapshot().savedCount).toBe(before)
      expect(StoreTryOnHarness.fingerprint(h.main.getSavedItems())).toBe(fingerprint)
    } finally { h.main.sampleShirtPreview = fixture }
    await h.tap('ViewTryOn')
    await h.screen('review')
    await h.until(() => h.canActivate('Retry'), 'background error Retry control')
    await h.tap('Retry')
    await h.screen('result')
    expect(h.main.getSnapshot().phase).toBe('result')
    expect(h.main.getSnapshot().previewFromLiveApi).toBe(false)
    expect(h.main.getSnapshot().savedCount).toBe(before)
    expect(StoreTryOnHarness.fingerprint(h.main.getSavedItems())).toBe(fingerprint)
    h.assertPhotoRole('StoreTryOn.TryOnPreviewCard')
    const retainedShopper = h.main.state.shopper
    const retainedGarment = h.main.state.garment
    await h.tap('Back')
    await h.screen('review')
    try {
      h.main.sampleShirtPreview = null
      await h.press('TryOn')
      await h.until(() => h.main.getSnapshot().phase === 'error', 'review generation error')
      expect(h.main.getSnapshot().screen).toBe('review')
      expect(h.main.getSnapshot().errorAction).toBe('TryOn')
    } finally { h.main.sampleShirtPreview = fixture }
    await h.tap('Back')
    await h.screen('garment')
    expect(h.main.getSnapshot().phase === 'error').toBe(false)
    expect(h.main.getSnapshot().errorAction).toBeNull()
    await h.until(() => h.canActivate('CaptureGarment'), 'capture control after leaving the failed review')
    expect(h.main.state.shopper === retainedShopper).toBe(true)
    expect(h.main.state.garment === retainedGarment).toBe(true)
    expect(StoreTryOnHarness.fingerprint(h.main.getSavedItems())).toBe(fingerprint)
    print('[StoreTryOn LEAF] Free background success/error preserved collection navigation and saved data; View try-on → Retry recovered with the retained inputs.')
  }
}

import {Scenario} from 'Leaf.lspkg/Scenarios/scenario/Scenario'
import {ScenarioConfig} from 'Leaf.lspkg/Scenarios/scenario/ScenarioConfig'
import {expect} from 'Leaf.lspkg/Utils/common/Expect'
import {StoreTryOnStorage} from '../Scripts/StoreTryOnStorage'
import {StoreTryOnHarness} from './StoreTryOnHarness'

/** One authorized paid request through Main's actual visible SIK controls. */
@component
export class StoreTryOnLiveUI extends Scenario {
  async run(config?: ScenarioConfig): Promise<void> {
    if (config?.get('confirmLiveRequest') !== 'true') {
      throw new Error('This UI test consumes one real YouCam request. Set confirmLiveRequest=true only for an authorized live run.')
    }
    const h = await StoreTryOnHarness.open(false)
    expect(h.main.getSnapshot().isEditor).toBe(true)
    expect(h.main.getSnapshot().sampleMode).toBe(true)
    expect(h.main.getSnapshot().useLiveApi).toBe(true)
    h.assertLiveConfigurationFromCache()
    h.requireCapacity(1)
    await h.capturePage()
    expect(h.visibleTextContains('LIVE YOUCAM · SAMPLE PHOTOS · uses credits')).toBe(true)
    expect(h.visibleTextContains('Use illustrations')).toBe(true)
    const before = h.main.getSnapshot().savedCount
    const existingIds = new StoreTryOnStorage().read().map(item => item.id)
    await h.tap('Shirt')
    await h.tap('ShopperPhoto')
    await h.tap('CaptureGarment')
    // Only the explicitly labelled synthetic fixtures may be uploaded here.
    expect(h.main.state.shopper !== null && h.main.state.shopper === h.main.sampleShopper).toBe(true)
    expect(h.main.state.garment !== null && h.main.state.garment === h.main.sampleShirt).toBe(true)
    expect(h.main.getSnapshot().previewReady).toBe(false)
    const started = Date.now()
    await h.tap('TryOn', 300000)
    const result = h.main.getSnapshot()
    expect(result.phase).toBe('result')
    expect(result.useLiveApi).toBe(true)
    expect(result.previewFromLiveApi).toBe(true)
    expect(result.previewReady).toBe(true)
    expect(result.message.includes('YouCam preview ready')).toBe(true)
    const texture = h.main.state.preview
    if (!texture) throw new Error('The live UI reported a result without a decoded texture.')
    expect(texture === h.main.sampleShirtPreview).toBe(false)
    expect(texture === h.main.sampleJacketPreview).toBe(false)
    expect(texture.getWidth() >= 512).toBe(true)
    expect(texture.getHeight() >= 512).toBe(true)
    expect(h.visibleTextContains('YouCam try-on preview')).toBe(true)
    expect(h.visiblePhotos().length).toBe(2)
    await h.tap('AddToList')
    expect(h.main.getSnapshot().savedCount).toBe(before + 1)
    const stored = new StoreTryOnStorage().read()
    expect(stored.length).toBe(before + 1)
    const added = stored[stored.length - 1]
    expect(existingIds.includes(added.id)).toBe(false)
    expect(added.category).toBe('shirt')
    expect(added.sample).toBe(false)
    expect(added.generatedByYouCam).toBe(true)
    expect(added.syntheticInputs).toBe(true)
    await StoreTryOnHarness.assertSavedImages(added)
    expect(h.main.getSnapshot().previewFromLiveApi).toBe(true)
    expect(h.main.getSnapshot().listOpen).toBe(false)
    expect(h.visibleTextContains('YouCam try-on preview')).toBe(true)
    print('[StoreTryOn LIVE UI] Capture controls → Try it on → Add passed ' + JSON.stringify({
      provider: 'YouCam Clothes V4', category: 'shirt', inputOrigin: 'synthetic fixtures',
      controller: 'normal StoreTryOnMain UI', resultFromLiveApi: true, savedCountDelta: 1,
      width: texture.getWidth(), height: texture.getHeight(), elapsedSeconds: (Date.now() - started) / 1000,
      persistedJpegImages: true, cachedCredentialMatchesRuntime: true, mocked: false, hardwareVerified: false,
    }))
    // Leave the actual generated result visible. Existing entries are untouched.
  }
}

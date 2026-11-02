import {Scenario} from 'Leaf.lspkg/Scenarios/scenario/Scenario'
import {expect} from 'Leaf.lspkg/Utils/common/Expect'
import {StoreTryOnStorage} from '../Scripts/StoreTryOnStorage'
import {StoreTryOnHarness} from './StoreTryOnHarness'

@component
export class StoreTryOnJacketReuse extends Scenario {
  async run(): Promise<void> {
    const h = await StoreTryOnHarness.open()
    h.requireCapacity(1)
    await h.shirtResult()
    const shopper = h.main.state.shopper
    const previousPreview = h.main.state.preview
    const before = h.main.getSnapshot().savedCount
    await h.tap('Jacket')
    expect(h.main.getSnapshot().category).toBe('jacket')
    expect(h.main.getSnapshot().garmentReady).toBe(false)
    expect(h.main.getSnapshot().previewReady).toBe(false)
    expect(h.main.state.shopper === shopper).toBe(true)
    await h.tap('CaptureGarment')
    expect(h.main.state.garment === h.main.sampleJacket).toBe(true)
    expect(h.main.state.shopper === shopper).toBe(true)
    expect(h.main.getSnapshot().previewReady).toBe(false)
    await h.tap('TryOn')
    expect(h.main.getSnapshot().phase).toBe('result')
    expect(h.main.state.preview === h.main.sampleJacketPreview).toBe(true)
    expect(h.main.state.preview === previousPreview).toBe(false)
    await h.tap('AddToList')
    expect(h.main.getSnapshot().savedCount).toBe(before + 1)
    const stored = new StoreTryOnStorage().read()
    const item = stored[stored.length - 1]
    expect(item.category).toBe('jacket')
    await StoreTryOnHarness.assertSavedImages(item)
    expect(h.main.state.shopper === shopper).toBe(true)
    print('[StoreTryOn LEAF] Jacket selection invalidated shirt result; shopper photo reused and jacket saved. Category→outer live mapping requires separate proxy/provider evidence.')
  }
}

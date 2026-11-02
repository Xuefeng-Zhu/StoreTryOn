import {Scenario} from 'Leaf.lspkg/Scenarios/scenario/Scenario'
import {expect} from 'Leaf.lspkg/Utils/common/Expect'
import {StoreTryOnStorage} from '../Scripts/StoreTryOnStorage'
import {StoreTryOnHarness} from './StoreTryOnHarness'

@component
export class StoreTryOnShirtFlow extends Scenario {
  async run(): Promise<void> {
    const h = await StoreTryOnHarness.open()
    h.requireCapacity(1)
    const before = h.main.getSnapshot().savedCount
    await h.shirtResult()
    const shopper = h.main.state.shopper
    await h.tap('AddToList')
    expect(h.main.getSnapshot().savedCount).toBe(before + 1)
    expect(h.main.getSnapshot().savedCurrent).toBe(true)
    const stored = new StoreTryOnStorage().read()
    expect(stored.length).toBe(before + 1)
    const item = stored[stored.length - 1]
    expect(item.category).toBe('shirt')
    expect(item.sample).toBe(true)
    expect(item.generatedByYouCam).toBe(false)
    expect(item.syntheticInputs).toBe(true)
    await StoreTryOnHarness.assertSavedImages(item)
    expect(h.canActivate('AddToList')).toBe(false)
    expect(h.main.getSnapshot().savedCount).toBe(before + 1)
    expect(h.main.state.shopper === shopper).toBe(true)
    expect(new StoreTryOnStorage().read().length).toBe(before + 1)
    await h.tap('TryAnother')
    await h.screen('garment')
    expect(h.main.state.shopper === shopper).toBe(true)
    expect(h.main.getSnapshot().garmentReady).toBe(false)
    expect(h.main.getSnapshot().previewReady).toBe(false)
    print('[StoreTryOn LEAF] Guided shirt → illustration → Add passed; saved Add disabled and Try another reuses the shopper. No live API claim.')
  }
}

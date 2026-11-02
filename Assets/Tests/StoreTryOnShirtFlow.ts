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
    const stored = new StoreTryOnStorage().read()
    expect(stored.length).toBe(before + 1)
    const item = stored[stored.length - 1]
    expect(item.category).toBe('shirt')
    await StoreTryOnHarness.assertSavedImages(item)
    await h.tap('AddToList')
    expect(h.main.getSnapshot().savedCount).toBe(before + 1)
    expect(h.main.getSnapshot().message.includes('already in your shopping list')).toBe(true)
    expect(h.main.state.shopper === shopper).toBe(true)
    expect(new StoreTryOnStorage().read().length).toBe(before + 1)
    print('[StoreTryOn LEAF] Shirt capture → sample preview → SIK Add passed; JPEG pixels persisted; duplicate prevented. No live API claim.')
  }
}

import {Scenario} from 'Leaf.lspkg/Scenarios/scenario/Scenario'
import {expect} from 'Leaf.lspkg/Utils/common/Expect'
import {StoreTryOnStorage} from '../Scripts/StoreTryOnStorage'
import {StoreTryOnHarness} from './StoreTryOnHarness'

@component
export class StoreTryOnPersistenceSeed extends Scenario {
  async run(): Promise<void> {
    const h = await StoreTryOnHarness.open()
    h.requireSyntheticList()
    const before = h.main.getSnapshot().savedCount
    const needed = Math.max(1, 3 - before)
    h.requireCapacity(needed)
    for (let index = 0; index < needed; index++) {
      await h.shirtResult()
      await h.tap('AddToList')
    }
    expect(h.main.getSnapshot().savedCount).toBe(before + needed)
    const stored = new StoreTryOnStorage().read()
    expect(stored.length).toBe(before + needed)
    for (const item of stored) await StoreTryOnHarness.assertSavedImages(item)
    h.checkpoint('seeded')
  }
}

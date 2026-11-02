import {Scenario} from 'Leaf.lspkg/Scenarios/scenario/Scenario'
import {expect} from 'Leaf.lspkg/Utils/common/Expect'
import {StoreTryOnStorage} from '../Scripts/StoreTryOnStorage'
import {StoreTryOnHarness} from './StoreTryOnHarness'

@component
export class StoreTryOnPersistenceSeed extends Scenario {
  async run(): Promise<void> {
    const h = await StoreTryOnHarness.open()
    h.requireSyntheticList()
    h.requireCapacity(1)
    const before = h.main.getSnapshot().savedCount
    await h.shirtResult()
    await h.tap('AddToList')
    expect(h.main.getSnapshot().savedCount).toBe(before + 1)
    const stored = new StoreTryOnStorage().read()
    expect(stored.length).toBe(before + 1)
    for (const item of stored) await StoreTryOnHarness.assertSavedImages(item)
    h.checkpoint('seeded')
  }
}

import {Scenario} from 'Leaf.lspkg/Scenarios/scenario/Scenario'
import {expect} from 'Leaf.lspkg/Utils/common/Expect'
import {StoreTryOnHarness} from './StoreTryOnHarness'

@component
export class StoreTryOnPersistenceVerify extends Scenario {
  async run(): Promise<void> {
    const h = await StoreTryOnHarness.open()
    await h.verifyCheckpoint('seeded')
    expect(h.main.getSnapshot().shopperReady).toBe(false)
    await h.capturePage()
    await h.tap('ShoppingList')
    expect(h.main.getSnapshot().listOpen).toBe(true)
    expect(h.visiblePhotos().length).toBe(2)
    expect(h.visibleTextContains('Photo thumbnails saved on this device')).toBe(true)
  }
}

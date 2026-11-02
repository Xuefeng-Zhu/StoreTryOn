import {Scenario} from 'Leaf.lspkg/Scenarios/scenario/Scenario'
import {expect} from 'Leaf.lspkg/Utils/common/Expect'
import {StoreTryOnHarness} from './StoreTryOnHarness'

@component
export class StoreTryOnClearRestartVerify extends Scenario {
  async run(): Promise<void> {
    const h = await StoreTryOnHarness.open()
    await h.verifyCheckpoint('cleared')
    await h.capturePage()
    await h.tap('ShoppingList')
    expect(h.main.getSnapshot().savedCount).toBe(0)
    expect(h.visiblePhotos().length).toBe(0)
    expect(h.visibleTextContains('No saved items yet')).toBe(true)
    await h.tap('Back')
  }
}

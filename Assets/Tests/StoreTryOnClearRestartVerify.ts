import {Scenario} from 'Leaf.lspkg/Scenarios/scenario/Scenario'
import {expect} from 'Leaf.lspkg/Utils/common/Expect'
import {StoreTryOnHarness} from './StoreTryOnHarness'

@component
export class StoreTryOnClearRestartVerify extends Scenario {
  async run(): Promise<void> {
    const h = await StoreTryOnHarness.open()
    await h.verifyCheckpoint('cleared')
    await h.openList()
    expect(h.main.getSnapshot().savedCount).toBe(0)
    expect(h.visiblePhotos().length).toBe(0)
    expect(h.canActivate('OpenItem:0')).toBe(false)
    expect(h.main.getSnapshot().clearConfirmation).toBe(false)
  }
}

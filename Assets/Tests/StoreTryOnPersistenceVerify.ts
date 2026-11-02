import {Scenario} from 'Leaf.lspkg/Scenarios/scenario/Scenario'
import {expect} from 'Leaf.lspkg/Utils/common/Expect'
import {StoreTryOnHarness} from './StoreTryOnHarness'

@component
export class StoreTryOnPersistenceVerify extends Scenario {
  async run(): Promise<void> {
    const h = await StoreTryOnHarness.open()
    await h.verifyCheckpoint('seeded')
    expect(h.main.getSnapshot().shopperReady).toBe(false)
    await h.openList()
    expect(h.main.getSnapshot().listOpen).toBe(true)
    await h.openItem(0)
    h.assertPhotoRole('StoreTryOn.GarmentPhotoCard')
    h.assertPhotoRole('StoreTryOn.TryOnPreviewCard')
    expect(h.visibleTextContains('saved on this device')).toBe(true)
  }
}

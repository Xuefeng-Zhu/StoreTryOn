import {Scenario} from 'Leaf.lspkg/Scenarios/scenario/Scenario'
import {expect} from 'Leaf.lspkg/Utils/common/Expect'
import {StoreTryOnHarness} from './StoreTryOnHarness'

@component
export class StoreTryOnListNavigation extends Scenario {
  async run(): Promise<void> {
    const h = await StoreTryOnHarness.open()
    await h.ensureSavedSample()
    await h.capturePage()
    const returnScreen = h.main.getSnapshot().screen
    const count = h.main.getSnapshot().savedCount
    const fingerprint = StoreTryOnHarness.fingerprint(h.main.getSavedItems())
    await h.openList()
    expect(h.main.getSnapshot().listOpen).toBe(true)
    expect(h.canActivate('AddToList')).toBe(false)
    await h.openItem(0)
    expect(h.main.getSnapshot().selectedIndex).toBe(0)
    h.assertPhotoRole('StoreTryOn.GarmentPhotoCard')
    h.assertPhotoRole('StoreTryOn.TryOnPreviewCard')
    expect(h.visibleTextContains('saved on this device')).toBe(true)
    await h.tap('Back')
    await h.screen('list')
    await h.openItem(count - 1)
    expect(h.main.getSnapshot().selectedIndex).toBe(count - 1)
    h.assertPhotoRole('StoreTryOn.TryOnPreviewCard')
    await h.tap('Back')
    await h.screen('list')
    await h.tap('Back')
    await h.screen(returnScreen)
    expect(h.main.getSnapshot().savedCount).toBe(count)
    expect(StoreTryOnHarness.fingerprint(h.main.getSavedItems())).toBe(fingerprint)
    print('[StoreTryOn LEAF] Collection grid → first/last item through actual scroll → Back passed; saved data and return screen preserved.')
  }
}

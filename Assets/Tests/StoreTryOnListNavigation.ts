import {Scenario} from 'Leaf.lspkg/Scenarios/scenario/Scenario'
import {expect} from 'Leaf.lspkg/Utils/common/Expect'
import {StoreTryOnHarness} from './StoreTryOnHarness'

@component
export class StoreTryOnListNavigation extends Scenario {
  async run(): Promise<void> {
    const h = await StoreTryOnHarness.open()
    await h.ensureSavedSample()
    await h.capturePage()
    const count = h.main.getSnapshot().savedCount
    await h.tap('ShoppingList')
    expect(h.main.getSnapshot().listOpen).toBe(true)
    expect(h.visiblePhotos().length).toBe(2)
    expect(h.visibleTextContains('Photo thumbnails saved on this device')).toBe(true)
    const before = h.main.getSnapshot().selectedIndex
    await h.tap('Next')
    expect(h.main.getSnapshot().selectedIndex).toBe((before + 1) % count)
    await h.tap('Previous')
    expect(h.main.getSnapshot().selectedIndex).toBe(before)
    expect(h.main.getSnapshot().savedCount).toBe(count)
    await h.tap('Back')
    expect(h.main.getSnapshot().listOpen).toBe(false)
    expect(h.main.getSnapshot().savedCount).toBe(count)
    print('[StoreTryOn LEAF] List opens saved JPEG thumbnails; Next/Previous wrap and Back preserves the list.')
  }
}

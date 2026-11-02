import {Scenario} from 'Leaf.lspkg/Scenarios/scenario/Scenario'
import {expect} from 'Leaf.lspkg/Utils/common/Expect'
import {StoreTryOnStorage} from '../Scripts/StoreTryOnStorage'
import {StoreTryOnHarness} from './StoreTryOnHarness'

@component
export class StoreTryOnClearConfirm extends Scenario {
  async run(): Promise<void> {
    const h = await StoreTryOnHarness.open()
    h.requireSyntheticList()
    await h.ensureSavedSample()
    await h.capturePage()
    await h.tap('ShoppingList')
    const before = h.main.getSnapshot().savedCount
    const fingerprint = StoreTryOnHarness.fingerprint(new StoreTryOnStorage().read())
    await h.tap('ClearList')
    expect(h.visibleTextContains('Tap Clear list again')).toBe(true)
    expect(h.main.getSnapshot().savedCount).toBe(before)
    await h.tap('Back')
    await h.tap('ShoppingList')
    await h.tap('ClearList')
    expect(h.main.getSnapshot().savedCount).toBe(before)
    expect(StoreTryOnHarness.fingerprint(new StoreTryOnStorage().read())).toBe(fingerprint)
    // Navigation is another action and must cancel the armed destructive state.
    await h.tap('Next')
    await h.tap('ClearList')
    expect(h.main.getSnapshot().savedCount).toBe(before)
    expect(StoreTryOnHarness.fingerprint(new StoreTryOnStorage().read())).toBe(fingerprint)
    await h.tap('ClearList')
    expect(h.main.getSnapshot().savedCount).toBe(0)
    expect(new StoreTryOnStorage().read().length).toBe(0)
    expect(h.visiblePhotos().length).toBe(0)
    expect(h.visibleTextContains('No saved items yet')).toBe(true)
    h.checkpoint('cleared')
    await h.tap('Back')
    print('[StoreTryOn LEAF] Back/Next cancel clear confirmation; second consecutive Clear removed only synthetic list entries. Run clear-restart-verify after preview reset.')
  }
}

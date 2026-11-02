import {Scenario} from 'Leaf.lspkg/Scenarios/scenario/Scenario'
import {expect} from 'Leaf.lspkg/Utils/common/Expect'
import {StoreTryOnHarness} from './StoreTryOnHarness'

@component
export class StoreTryOnGuardRetry extends Scenario {
  async run(): Promise<void> {
    const h = await StoreTryOnHarness.open()
    const before = h.main.getSnapshot().savedCount
    await h.freshVisit()
    await h.tap('TryOn')
    expect(h.main.getSnapshot().phase).toBe('error')
    expect(h.main.getSnapshot().message.includes('Capture your photo and a garment')).toBe(true)
    expect(h.visibleTextContains('Retry try-on')).toBe(true)
    await h.tap('AddToList')
    expect(h.main.getSnapshot().phase).toBe('error')
    expect(h.main.getSnapshot().savedCount).toBe(before)
    expect(h.main.getSnapshot().message.includes('Generate a try-on preview')).toBe(true)
    await h.tap('Shirt')
    await h.tap('CaptureGarment')
    await h.tap('TryOn')
    expect(h.main.getSnapshot().phase).toBe('error')
    expect(h.main.getSnapshot().previewReady).toBe(false)
    await h.tap('ShopperPhoto')
    await h.tap('TryOn')
    expect(h.main.getSnapshot().phase).toBe('result')
    expect(h.main.getSnapshot().previewReady).toBe(true)
    expect(h.main.getSnapshot().savedCount).toBe(before)
    print('[StoreTryOn LEAF] Missing-input and premature-add guards passed through real controls; retry recovered after sample shopper capture.')
  }
}

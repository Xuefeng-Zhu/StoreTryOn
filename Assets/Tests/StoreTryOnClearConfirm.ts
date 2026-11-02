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
    await h.openList()
    const before = h.main.getSnapshot().savedCount
    const fingerprint = StoreTryOnHarness.fingerprint(new StoreTryOnStorage().read())
    const cacheBefore = global.persistentStorageSystem.store.getString('StoreTryOn.previewProxy.v1')
    await h.tap('ClearList')
    expect(h.main.getSnapshot().clearConfirmation).toBe(true)
    expect(h.canActivate('ConfirmClear')).toBe(true)
    expect(h.canActivate('CancelClear')).toBe(true)
    expect(h.canActivate('OpenItem:0')).toBe(false)
    await h.tap('CancelClear')
    expect(h.main.getSnapshot().clearConfirmation).toBe(false)
    expect(h.main.getSnapshot().savedCount).toBe(before)
    expect(StoreTryOnHarness.fingerprint(new StoreTryOnStorage().read())).toBe(fingerprint)
    await h.tap('ClearList')
    h.requireSyntheticList()
    await h.tap('ConfirmClear')
    await h.screen('list')
    expect(h.main.getSnapshot().clearConfirmation).toBe(false)
    expect(h.main.getSnapshot().storageReady).toBe(true)
    expect(h.main.getSnapshot().savedCount).toBe(0)
    expect(new StoreTryOnStorage().read().length).toBe(0)
    expect(h.canActivate('OpenItem:0')).toBe(false)
    expect(global.persistentStorageSystem.store.getString('StoreTryOn.previewProxy.v1') === cacheBefore).toBe(true)
    h.checkpoint('cleared')
    print('[StoreTryOn LEAF] Explicit Cancel/Confirm clear passed; only synthetic entries cleared and preview credentials preserved. Reset before clear-restart-verify.')
  }
}

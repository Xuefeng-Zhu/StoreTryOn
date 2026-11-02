import {Scenario} from 'Leaf.lspkg/Scenarios/scenario/Scenario'
import {ScenarioConfig} from 'Leaf.lspkg/Scenarios/scenario/ScenarioConfig'
import {expect} from 'Leaf.lspkg/Utils/common/Expect'
import {StoreTryOnHarness} from './StoreTryOnHarness'
import {resolvePreviewProxySettings} from '../Scripts/StoreTryOnPreviewSettings'

const runtimeToken = Date.now().toString(36) + '-' + Math.random().toString(36)
const restartKey = 'StoreTryOn.LEAF.liveDefaultRuntime.v1'

/** Free startup/cache check: never loads photos or requests generation. */
@component
export class StoreTryOnLiveDefault extends Scenario {
  async run(config?: ScenarioConfig): Promise<void> {
    const h = await StoreTryOnHarness.open(false)
    const snapshot = h.main.getSnapshot()
    expect(snapshot.isEditor).toBe(true)
    expect(snapshot.sampleMode).toBe(true)
    expect(snapshot.useLiveApi).toBe(true)
    expect(snapshot.previewFromLiveApi).toBe(false)
    h.assertLiveConfigurationFromCache()
    // Reading settings for another origin must not forward the cached token.
    expect(resolvePreviewProxySettings('https://different.invalid', '', true).accessToken.length === 0).toBe(true)
    expect(h.visibleTextContains('LIVE YOUCAM · SAMPLE PHOTOS · uses credits')).toBe(true)
    expect(h.visibleTextContains('Use illustrations')).toBe(true)
    expect(h.visibleTextContains('Try it on sends them to YouCam')).toBe(true)
    const restartCheck = config?.get('restartCheck') || 'record'
    if (restartCheck === 'verify') {
      const previousRuntime = global.persistentStorageSystem.store.getString(restartKey)
      if (!previousRuntime) throw new Error('Run live-default with restartCheck=record, reset preview, then verify.')
      if (previousRuntime === runtimeToken) throw new Error('Restart verification requires an actual new preview runtime.')
    } else if (restartCheck === 'record') {
      global.persistentStorageSystem.store.putString(restartKey, runtimeToken)
      expect(global.persistentStorageSystem.store.getString(restartKey) === runtimeToken).toBe(true)
    } else throw new Error('restartCheck must be record or verify.')
    // Root verifies the authored Inspector credential is empty before resetting;
    // a running Lens cannot inspect that original field after cache resolution.
    print('[StoreTryOn LIVE UI] Default verified ' + JSON.stringify({restartCheck,
      editor: true, syntheticInputs: true, liveApi: true, cachedCredentialMatchesRuntime: true,
      generationRequested: false, hardwareVerified: false}))
  }
}

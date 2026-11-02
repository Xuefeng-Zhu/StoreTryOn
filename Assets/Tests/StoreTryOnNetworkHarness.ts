import {findSceneObjectByName, sleep} from 'Leaf.lspkg/Utils/common/Utils'
import {expect} from 'Leaf.lspkg/Utils/common/Expect'
import {StoreTryOnMain} from '../Scripts/StoreTryOnMain'

/** Uses the actual Lens InternetModule; never a browser or mocked transport. */
export class StoreTryOnNetworkHarness {
  readonly internet: InternetModule = require('LensStudio:InternetModule')
  readonly base: string

  private constructor(readonly main: StoreTryOnMain) {
    this.base = main.proxyBaseUrl.replace(/\/+$/, '')
    if (!/^https:\/\/[^/?#]+$/.test(this.base) || main.proxyAccessToken.length < 32) {
      throw new Error('Configure the HTTPS proxy and its separate credential before this network test.')
    }
  }

  static async open(): Promise<StoreTryOnNetworkHarness> {
    await sleep(1500)
    if (!global.deviceInfoSystem.isEditor()) throw new Error('This networking verification is preview-only; hardware testing requires a separate acceptance run.')
    const root = findSceneObjectByName('StoreTryOn')
    const main = root?.getComponent(StoreTryOnMain.getTypeName()) as StoreTryOnMain | null
    if (!main) throw new Error('StoreTryOnMain was not found.')
    return new StoreTryOnNetworkHarness(main)
  }

  async probe(): Promise<void> {
    const health = await this.internet.fetch(this.base + '/healthz', {method: 'GET'})
    expect(health.status).toBe(200)
    expect((await health.json()).status).toBe('ok')
    const missing = await this.internet.fetch(this.base + '/v1/tryons', {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}',
    })
    expect(missing.status).toBe(401)
    expect((await missing.json()).error).toBe('unauthorized')
    const wrong = await this.internet.fetch(this.base + '/v1/tryons', {
      method: 'POST', headers: {'Content-Type': 'application/json', Authorization: 'Bearer deliberately-invalid-network-test'}, body: '{}',
    })
    expect(wrong.status).toBe(401)
    const authenticated = await this.internet.fetch(this.base + '/v1/tryons', {
      method: 'POST', headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + this.main.proxyAccessToken}, body: '{}',
    })
    expect(authenticated.status).toBe(400)
    expect((await authenticated.json()).error).toBe('invalid_category')
    print('[StoreTryOn NETWORK] HTTPS probe ' + JSON.stringify({target: 'SPECS 27 preview', health: 200,
      missingCredential: 401, wrongCredential: 401, authenticatedValidation: 400, generationRequested: false}))
  }
}

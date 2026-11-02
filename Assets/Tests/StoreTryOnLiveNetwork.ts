import {Scenario} from 'Leaf.lspkg/Scenarios/scenario/Scenario'
import {ScenarioConfig} from 'Leaf.lspkg/Scenarios/scenario/ScenarioConfig'
import {expect} from 'Leaf.lspkg/Utils/common/Expect'
import {StoreTryOnProxy} from '../Scripts/StoreTryOnProxy'
import {encodeImage, decodeImage} from '../Scripts/StoreTryOnImages'
import {StoreTryOnNetworkHarness} from './StoreTryOnNetworkHarness'

@component
export class StoreTryOnLiveNetwork extends Scenario {
  async run(config?: ScenarioConfig): Promise<void> {
    if (config?.get('confirmLiveRequest') !== 'true') {
      throw new Error('This test consumes one real YouCam request. Set confirmLiveRequest=true only for an authorized live run.')
    }
    const network = await StoreTryOnNetworkHarness.open()
    const main = network.main
    if (!main.sampleShopper || !main.sampleShirt) throw new Error('Synthetic input fixtures are missing.')
    const shopper = await encodeImage(main.sampleShopper)
    const garment = await encodeImage(main.sampleShirt)
    print('[StoreTryOn NETWORK] Live request ' + JSON.stringify({category: 'shirt', inputs: 'synthetic',
      transport: 'Lens InternetModule HTTPS', shopperBase64Characters: shopper.length, garmentBase64Characters: garment.length}))
    const proxy = new StoreTryOnProxy(network.base, main.proxyAccessToken, seconds => this.delay(seconds))
    expect(proxy.configured()).toBe(true)
    const started = Date.now()
    const result = await proxy.generate(shopper, garment, 'shirt', message => print('[StoreTryOn NETWORK] ' + message))
    expect(result.startsWith('/9j/') || result.startsWith('iVBORw0KGgo')).toBe(true)
    const bytes = Base64.decode(result)
    expect(bytes.length > 1000).toBe(true)
    const texture = await decodeImage(result)
    expect(texture.getWidth() >= 512).toBe(true)
    expect(texture.getHeight() >= 512).toBe(true)
    let checksum = 0
    for (let i = 0; i < bytes.length; i++) checksum = (checksum + bytes[i]) >>> 0
    print('[StoreTryOn NETWORK] Live result ' + JSON.stringify({target: 'SPECS 27 preview',
      provider: 'YouCam Clothes V4', category: 'shirt', inputOrigin: 'synthetic fixtures',
      width: texture.getWidth(), height: texture.getHeight(), outputBytes: bytes.length,
      outputBase64Characters: result.length, checksum, elapsedSeconds: (Date.now() - started) / 1000,
      mocked: false, hardwareVerified: false}))
  }

  private delay(seconds: number): Promise<void> {
    return new Promise(resolve => {
      const event = this.createEvent('DelayedCallbackEvent')
      event.bind(() => resolve())
      event.reset(seconds)
    })
  }
}

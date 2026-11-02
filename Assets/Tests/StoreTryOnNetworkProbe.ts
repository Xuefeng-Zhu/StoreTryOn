import {Scenario} from 'Leaf.lspkg/Scenarios/scenario/Scenario'
import {StoreTryOnNetworkHarness} from './StoreTryOnNetworkHarness'

@component
export class StoreTryOnNetworkProbe extends Scenario {
  async run(): Promise<void> {
    const network = await StoreTryOnNetworkHarness.open()
    await network.probe()
  }
}

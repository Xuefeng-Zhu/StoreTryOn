import {scenariosIndex} from 'Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator'
import {ScenarioMetadata} from 'Leaf.lspkg/Scenarios/scenario/ScenarioMetadata'
import {StoreTryOnShirtFlow} from './StoreTryOnShirtFlow'
import {StoreTryOnJacketReuse} from './StoreTryOnJacketReuse'
import {StoreTryOnGuardRetry} from './StoreTryOnGuardRetry'
import {StoreTryOnListNavigation} from './StoreTryOnListNavigation'
import {StoreTryOnClearConfirm} from './StoreTryOnClearConfirm'
import {StoreTryOnPersistenceSeed} from './StoreTryOnPersistenceSeed'
import {StoreTryOnPersistenceVerify} from './StoreTryOnPersistenceVerify'
import {StoreTryOnClearRestartVerify} from './StoreTryOnClearRestartVerify'
import {StoreTryOnIKReach} from './StoreTryOnIKReach'
import {StoreTryOnNetworkProbe} from './StoreTryOnNetworkProbe'
import {StoreTryOnLiveNetwork} from './StoreTryOnLiveNetwork'
import {StoreTryOnLiveDefault} from './StoreTryOnLiveDefault'
import {StoreTryOnLiveUI} from './StoreTryOnLiveUI'
import {StoreTryOnGuidedNavigation} from './StoreTryOnGuidedNavigation'
import {StoreTryOnBackgroundGeneration} from './StoreTryOnBackgroundGeneration'
import {StoreTryOnVisualCheck} from './StoreTryOnVisualCheck'
import {StoreTryOnTransportRecovery} from './StoreTryOnTransportRecovery'

@component
export class LeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex: ScenarioMetadata[] = [
    {id: 'storetryon-transport-recovery', typename: StoreTryOnTransportRecovery.getTypeName(), parameters: {__leaf__timeout_secs: '60'}},
    {id: 'storetryon-guided-navigation', typename: StoreTryOnGuidedNavigation.getTypeName()},
    {id: 'storetryon-background-generation', typename: StoreTryOnBackgroundGeneration.getTypeName()},
    {id: 'storetryon-visual-check', typename: StoreTryOnVisualCheck.getTypeName(), parameters: {screen: 'shopper', __leaf__timeout_secs: '90'}},
    {id: 'storetryon-shirt-flow', typename: StoreTryOnShirtFlow.getTypeName()},
    {id: 'storetryon-jacket-reuse', typename: StoreTryOnJacketReuse.getTypeName()},
    {id: 'storetryon-guard-retry', typename: StoreTryOnGuardRetry.getTypeName()},
    {id: 'storetryon-list-navigation', typename: StoreTryOnListNavigation.getTypeName()},
    {id: 'storetryon-persistence-seed', typename: StoreTryOnPersistenceSeed.getTypeName()},
    {id: 'storetryon-persistence-verify', typename: StoreTryOnPersistenceVerify.getTypeName()},
    {id: 'storetryon-clear-confirm', typename: StoreTryOnClearConfirm.getTypeName()},
    {id: 'storetryon-clear-restart-verify', typename: StoreTryOnClearRestartVerify.getTypeName()},
    {id: 'storetryon-network-probe', typename: StoreTryOnNetworkProbe.getTypeName(), parameters: {__leaf__timeout_secs: '90'}},
    {id: 'storetryon-live-network', typename: StoreTryOnLiveNetwork.getTypeName(), parameters: {
      confirmLiveRequest: 'false', __leaf__timeout_secs: '360',
    }},
    {id: 'storetryon-live-default', typename: StoreTryOnLiveDefault.getTypeName(), parameters: {
      restartCheck: 'record', expectServiceReady: 'auto', __leaf__timeout_secs: '60',
    }},
    {id: 'storetryon-live-ui', typename: StoreTryOnLiveUI.getTypeName(), parameters: {
      confirmLiveRequest: 'false', __leaf__timeout_secs: '360',
    }},
    {id: 'storetryon-ik-reach', typename: StoreTryOnIKReach.getTypeName(), parameters: {
      requireDirect: 'false', __leaf__diagnostic_policy: 'fail-fast',
      __leaf__diagnostic_report_duration_ms: '0', __leaf__timeout_secs: '120',
    }},
  ]
}

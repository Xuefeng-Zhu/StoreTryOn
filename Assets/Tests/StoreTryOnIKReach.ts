import {Scenario} from 'Leaf.lspkg/Scenarios/scenario/Scenario'
import {ScenarioConfig} from 'Leaf.lspkg/Scenarios/scenario/ScenarioConfig'
import {createIKInteractor} from 'Leaf.lspkg/Interactors/interactor/ik/visualizer/BitmojiAvatar'
import {DiagnosticRecorder} from 'Leaf.lspkg/Diagnostic/DiagnosticRecorder'
import {Button} from 'SpectaclesUIKit.lspkg/Scripts/Components/Button/Button'
import {expect} from 'Leaf.lspkg/Utils/common/Expect'
import {StoreTryOnHarness} from './StoreTryOnHarness'

@component
export class StoreTryOnIKReach extends Scenario {
  async run(config?: ScenarioConfig): Promise<void> {
    const h = await StoreTryOnHarness.open()
    await h.capturePage()
    const target = h.target('ShoppingList')
    const ik = createIKInteractor({avatar: {debugOverlay: false}})
    // The actual Leaf2 API exposes rig readiness; a fixed delay can race the
    // avatar download and joint initialization.
    await ik.ready
    const object = h.main.getControl('ShoppingList')
    if (!object) throw new Error('Shopping list control disappeared while IK initialized.')
    const button = object.getComponent(Button.getTypeName()) as Button | null
    if (!button) throw new Error('Shopping list UIKit Button is missing.')
    const events = {hover: 0, start: 0, end: 0, endOutside: 0, buttonUp: 0}
    const unsubscribe = [
      target.onHoverEnter.add(event => { if (event.propagationPhase === 'Target') events.hover++ }),
      target.onTriggerStart.add(event => { if (event.propagationPhase === 'Target') events.start++ }),
      target.onTriggerEnd.add(event => { if (event.propagationPhase === 'Target') events.end++ }),
      target.onTriggerEndOutside.add(event => { if (event.propagationPhase === 'Target') events.endOutside++ }),
      button.onTriggerUp.add(() => { events.buttonUp++ }),
    ]
    try {
      const indirect = ik.right.isIndirect(target)
      print('[StoreTryOn LEAF] IK ShoppingList route=' + (indirect ? 'far-field ray' : 'direct poke') + '; no direct-reach claim unless route is direct.')
      if (config?.get('requireDirect') === 'true') expect(indirect).toBe(false)
      // Keep fail-fast reach checks and the real IK path. Leaf2 records some
      // event timeouts without throwing, and accepts trigger-end-outside as
      // completion; report those before the product postcondition is checked.
      try { await ik.trigger(target) }
      finally {
        print('[StoreTryOn LEAF] IK events ' + JSON.stringify(events))
        const diagnostics = DiagnosticRecorder.getInstance()
        const report = diagnostics.toReport()
        print('[StoreTryOn LEAF] IK diagnostic entries=' + diagnostics.getAll().length + '; errors=' + diagnostics.hasErrors())
        if (report) print('[StoreTryOn LEAF] IK diagnostics:' + report)
      }
      await h.until(() => h.main.getSnapshot().listOpen, 'IK opens Shopping list')
      expect(h.main.getSnapshot().listOpen).toBe(true)
      await h.tap('Back')
    } finally {
      unsubscribe.forEach(remove => remove())
    }
  }
}

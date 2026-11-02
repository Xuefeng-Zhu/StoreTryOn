# Preview scenario contract

Source-verified names and APIs, read from StoreTryOnMain.ts and StoreTryOnPanelUI.ts. Runtime existence is asserted by the harness before each interaction. No product object names were invented, and tests never invoke handleAction or the UI's action event directly.

| object_name | component | property / observation | expected after corresponding action |
| --- | --- | --- | --- |
| StoreTryOn | StoreTryOnMain | getSnapshot / state | source-defined capture, result, error, list states |
| StoreTryOn.ShopperPhoto | UIKit Button → SIK Interactable | onTriggerUp | shopperReady true in sample mode |
| StoreTryOn.CaptureGarment | UIKit Button → SIK Interactable | onTriggerUp | garmentReady true; prior result invalidated |
| StoreTryOn.TryOn | UIKit Button → SIK Interactable | onTriggerUp | result with both inputs; error without them |
| StoreTryOn.AddToList | UIKit Button → SIK Interactable | onTriggerUp | savedCount +1; duplicate does not increment |
| StoreTryOn.Shirt | UIKit Button → SIK Interactable | onTriggerUp | category shirt |
| StoreTryOn.Jacket | UIKit Button → SIK Interactable | onTriggerUp | category jacket, garment/result cleared, shopper reused |
| StoreTryOn.ToggleMode | UIKit Button → SIK Interactable | onTriggerUp | mode toggles, visit inputs/result cleared, list preserved |
| StoreTryOn.ShoppingList | UIKit Button → SIK Interactable | onTriggerUp | listOpen true, saved photos decoded |
| StoreTryOn.Previous | UIKit Button → SIK Interactable | onTriggerUp | selectedIndex wraps down |
| StoreTryOn.Next | UIKit Button → SIK Interactable | onTriggerUp | selectedIndex wraps up |
| StoreTryOn.ClearList | UIKit Button → SIK Interactable | onTriggerUp | first asks, consecutive second deletes |
| StoreTryOn.Back | UIKit Button → SIK Interactable | onTriggerUp | listOpen false; clear confirmation cancelled |
| StoreTryOn.PhotoPixels (four source instances) | Image | enabled in hierarchy, base texture | exactly two visible for capture/result or populated list |

The controller root is authored by the scene builder. All action names are assigned by actionRow() from the source action enum; Button.interactable is the actual SIK target. Text assertions search enabled Text components within the StoreTryOn hierarchy rather than assuming names for unnamed text Items.

## Suggested execution sequence

1. Compile and attach LeafIndex.ts to one enabled authored SceneObject. List scenarios with onDevice:false.
2. Run shirt-flow, jacket-reuse, guard-retry, list-navigation. These preserve existing entries and use count deltas. They require free list capacity for their new samples.
3. Run persistence-seed; reset the actual preview runtime; run persistence-verify before other actions. The verifier rejects a same-runtime read and checks IDs, categories, image checksums, JPEG decode, and controller startup reload. Shopper photo must be absent after the new visit starts.
4. Run clear-confirm; reset the actual preview runtime; run clear-restart-verify. Clear refuses any item not explicitly marked sample, exercises Back/Next cancellation, and only then clears synthetic entries.
5. Run ik-reach. Default requireDirect:false tests the layout's actual route and logs direct poke versus far-field ray; setting requireDirect:true makes an indirect route fail. Diagnostic policy is fail-fast, preventing a silent scripted fallback from passing a failed IK reach.

No scenario auto-runs. Checkpoint scenarios write a small separate StoreTryOn.LEAF.checkpoint.v1 key; it contains IDs/checksums, not duplicate photo bodies. These tests do not prove camera permissions/capture, real shopper photo transfer, network latency, live YouCam generation, physical hand comfort, device restart persistence, or hardware storage retention.

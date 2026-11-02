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

Editor input source and generation mode are independent: sampleMode means synthetic input photos, while useLiveApi selects YouCam versus free illustrations. Existing functional scenarios explicitly select useLiveApi:false through the real ToggleMode control in Harness.open()/sampleMode(). They do not infer free behavior merely from sampleMode:true. The two live UI scenarios opt out of that setup. Hardware camera/demo toggling remains a separate device behavior.

## Suggested execution sequence

1. Compile and attach LeafIndex.ts to one enabled authored SceneObject. List scenarios with onDevice:false.
2. Run shirt-flow, jacket-reuse, guard-retry, list-navigation. These preserve existing entries and use count deltas. They require free list capacity for their new samples.
3. Run persistence-seed; reset the actual preview runtime; run persistence-verify before other actions. The verifier rejects a same-runtime read and checks IDs, categories, image checksums, JPEG decode, and controller startup reload. Shopper photo must be absent after the new visit starts.
4. Run clear-confirm; reset the actual preview runtime; run clear-restart-verify. Clear refuses entries not marked syntheticInputs:true or legacy sample:true, exercises Back/Next cancellation, and only then clears synthetic entries.
5. Run ik-reach. Default requireDirect:false tests the layout's actual route and logs direct poke versus far-field ray; setting requireDirect:true makes an indirect route fail. Diagnostic policy is fail-fast, preventing a silent scripted fallback from passing a failed IK reach.

No scenario auto-runs. Checkpoint scenarios write a small separate StoreTryOn.LEAF.checkpoint.v1 key; it contains IDs/checksums, not duplicate photo bodies. These nine synthetic action scenarios do not prove camera permissions/capture, real shopper photo transfer, network latency, live YouCam generation, physical hand comfort, device restart persistence, or hardware storage retention.

## Additional networking scenarios

`storetryon-network-probe` uses actual `InternetModule` HTTPS to assert health 200, missing/wrong credentials 401, and valid-credential request validation 400, without starting generation. `storetryon-live-network` uses the same production `StoreTryOnProxy` as the application and synthetic input textures to perform one actual provider generation and decode the returned JPEG into a native Texture. The live scenario requires the explicit `confirmLiveRequest=true` parameter and otherwise refuses to spend credits.

Configure the public endpoint and separate proxy credential locally before running these preview-only scenarios. Never put credentials in LEAF parameters or logs. The verification run cleared the transient credential before saving the scene. See [network results](../Evidence/network-preview/README.md) for actual outcomes and scope.

## Normal live UI and cached startup

- `storetryon-live-default` is free and never requests generation. With locally cached proxy configuration and an externally verified empty authored Inspector credential, run restartCheck:record; reset preview; run restartCheck:verify. It asserts a new module runtime, live API startup, synthetic inputs, live/credit labels, and boolean equality between cached configuration and resolved runtime fields. It also verifies that resolving a different origin does not forward the cached credential. It never logs credential values. The separate checkpoint contains only a runtime marker.
- `storetryon-live-ui` defaults confirmLiveRequest:false and refuses to run without the explicit true parameter. It makes one generation request by driving ShopperPhoto, CaptureGarment, TryOn, and AddToList through their actual UIKit/SIK Interactables. It permits a 300-second generation wait, checks the controller's live-output provenance and decoded non-fixture texture, then verifies a +1 saved count, actual JPEG thumbnails, generatedByYouCam:true, and syntheticInputs:true. Existing entries remain unchanged and the generated result stays visible for inspection.
- `storetryon-live-network` remains a separate opt-in test of the lower-level Lens InternetModule/client path. Passing it alone does not prove that the main UI uses the live path; the live-ui scenario covers that gap.
- Destructive clear scenarios accept only entries with syntheticInputs:true or legacy sample:true. They refuse entries containing actual shopper photos. A live provider result from synthetic inputs may therefore be cleared by these explicitly synthetic-data scenarios, but the live-ui scenario itself never clears the list.

These are authored checks, not claims that the new live-default or live-ui runs have passed. Record actual tool and Lens manager results separately after execution.

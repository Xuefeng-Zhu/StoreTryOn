# Preview verification

Final result on November 1, 2026 (America/Los_Angeles): **9 / 9 LEAF scenarios passed** in Lens Studio 5.23.2 SPECS preview.

| Scenario | Final outcome | Verified behavior |
| --- | --- | --- |
| `storetryon-shirt-flow` | passed | SIK capture/try-on/add, JPEG bytes, duplicate-save prevention |
| `storetryon-jacket-reuse` | passed | Shopper reuse, previous preview invalidation, jacket sample save |
| `storetryon-guard-retry` | passed | Missing-input and premature-add guards, successful recovery |
| `storetryon-list-navigation` | passed | Saved images, Previous/Next wrap, Back preserves entries |
| `storetryon-persistence-seed` | passed | Save three sample entries and image checksums |
| `storetryon-persistence-verify` | passed | A new preview runtime reloads the same IDs/categories/JPEG checksums and displays decoded images |
| `storetryon-clear-confirm` | passed | Back/Next cancel clearing; consecutive confirmation removes synthetic entries |
| `storetryon-clear-restart-verify` | passed | A new preview runtime remains empty after clear |
| `storetryon-ik-reach` | passed | Real IK far-field ray activates UIKit Shopping list; one hover/start/end/button event and zero diagnostics |

`leaf-preview-results.json` and `leaf-preview-manager.log` retain authoritative Lens-side manager results, including earlier failures. The first jacket attempt timed out after 90 seconds; a diagnostic rerun passed. No definitive cause for the initial timeout was established. The first IK attempt failed while the test used a fixed 500 ms avatar delay. Awaiting the actual `ik.ready` promise corrected test initialization; the next run passed with `endOutside: 0` and one actual UIKit activation. No scripted fallback was substituted for IK.

`shirt-preview.png` shows the sample result and duplicate guard. `shopping-list-preview.png` shows three entries after a true preview reset, with decoded local thumbnails. Green text at the top is the LEAF result overlay. The images inside the Lens are labeled synthetic/illustrative fixtures, distinct from the real generated images in [LiveEvidence](../LiveEvidence/README.md).

The native storage quota reported 102400 bytes. Entries contain local 192-pixel JPEG thumbnails; the original shopper photo is not persisted separately. The tests cleared only entries explicitly marked sample, and the final list is empty.

Hardware camera permissions/framing, real shopper-photo transfer, physical hand comfort/direct touch, Lens-to-deployed-proxy networking, and persistence across actual SPECS relaunches are not established by these tests. Real provider adapter proof is documented separately. The editor's runtime log contained no application exception in the final refresh; the LEAF plugin emits an external destroyed-before-settings-load warning during some resets.

## Repeat the checks

Use the LEAF panel on preview, in the sequence in [SCENE_CONTRACT.md](../Tests/SCENE_CONTRACT.md). The seed/verify pairs require an actual preview runtime reset between them; the MCP scenario runner performs this reset. Do not run scenarios in parallel. Capture screenshots outside `Assets/` during execution to avoid resource-import activity, and copy them into evidence after the runs finish.

The project uses official LEAF 2.0.2 and Inspect 2.0.1 to match the template's SIK/UIKit 2.0 namespaces. If a package replacement leaves the LEAF panel stale, recreate that panel through supported Lens Studio tooling. Do not bypass MCP with HTTP.

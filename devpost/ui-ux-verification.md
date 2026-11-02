# StoreTryOn premium retail UX verification

Verified November 2, 2026 in Lens Studio 5.23.2 SPECS preview. Native UIKit/SIK window: 44 × 54 cm at 110 cm. Physical-device behavior is not claimed.

## Passed checks

| Scenario | Observed outcome |
| --- | --- |
| storetryon-shirt-flow | Guided photo/review/result/save; saved state prevents duplicate Add; next garment retains shopper. |
| storetryon-jacket-reuse | Jacket selection and matching fixture; shopper photo reused. |
| storetryon-guard-retry | Failed captures and retakes preserve usable inputs; forced list capacity failure preserves result/data; Retry adds exactly one entry. |
| storetryon-guided-navigation | Back, retake, settings and mode changes preserve inputs and invalidate incompatible results. |
| storetryon-background-generation | Generation continues during list browsing; success/error do not force navigation; resume/Retry and Back-from-error recover. |
| storetryon-persistence-seed / persistence-verify | At least three JPEG pairs survive actual preview reset with matching fingerprints and successful decoding. |
| storetryon-list-navigation | Three-item collection; actual ScrollWindow interaction reaches second row; first/last detail and return navigation preserve data. |
| storetryon-clear-confirm / clear-restart-verify | Cancel preserves all entries; confirm removes image bytes; reset remains empty. Clear preserves populated preview-credential cache. |
| storetryon-ik-reach | Actual preview hand targeting activates visible controls without interaction diagnostics. |
| storetryon-visual-check, walkthrough | Eleven guided states plus transient generation observed in actual window recording. [Frame manifest](evidence/premium-ux/free-walkthrough-observations.json). |
| storetryon-transport-recovery | Injected transport, no network: partial JSON/disconnect GET retries reuse one job; explicit resume/cached result avoids POST/GET; full-size JPEG validation; discarded in-flight creation cannot restore pending state. |
| storetryon-live-default | Live selection/readiness and origin-matched cached credential verified across preview resets while authored credential remains empty. |
| storetryon-network-probe | Actual InternetModule HTTPS: health 200, absent/wrong auth 401, authenticated invalid body 400, no generation. |
| storetryon-live-ui | Actual visible SIK flow → real YouCam Clothes V4 shirt request → decoded 1024 × 1536 result → exactly one saved JPEG pair → collection and saved item detail → result. Synthetic inputs; mocked=false. |

## Real run

The successful UI run took 43.679 seconds from Try it on through generation, saving, recorded viewing pauses and saved-item navigation; this is not provider-only latency. Exactly one item was added, with generatedByYouCam=true and syntheticInputs=true. [Actual saved result](evidence/premium-ux/live-result.png).

An earlier live attempt received HTTP 200 but the native connection closed while reading a polling response. It did not display a result. That failed recording is retained privately. The client now retries read-only GETs at most three times, retains the existing job/result for recovery, and never automatically repeats creation POSTs. Successful bytes are released only after native decoding succeeds or visit inputs change. The final recorded live run passed with no runtime error in the inspected log window.

## Corrections and boundaries

The first interaction test hung because page teardown raced SIK hover release; dispatch now waits three LateUpdate frames. A missing resume action on an empty list after background failure was corrected and retested. Lens Studio OAuth refresh twice reset preview and destroyed the LEAF panel; those runs were recorded as interrupted and rerun after reconnecting the native panel.

Source changes/editor sign-in reloads were observed to change preview-local state. Restart persistence above is established with code held fixed; editor storage is not secure identity storage. No provider/proxy credential is embedded in source or the saved scene. Exact-value scan passed.

Inputs are labelled synthetic photos. Free illustration checks make no provider request. The separately enabled live test is provider evidence. Physical SPECS camera, networking, hand tracking, comfort and device relaunch persistence remain unverified. The user selected Lens Studio footage for the demo, which is labelled SPECS preview. Public video export/upload is tracked separately in the demo record.

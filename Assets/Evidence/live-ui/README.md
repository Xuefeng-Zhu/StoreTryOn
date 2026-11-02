# Normal preview UI uses live YouCam

Verified November 2, 2026, America/Los_Angeles, in SPECS 27 Lens Studio preview.

The earlier implementation used one `sampleMode` flag for both editor input photos and illustrative generation. Live networking was proved in a separate test, and its transient credential was removed afterward. Consequently, the ordinary Try it on button still selected an illustration. This has been corrected.

Sample input source and generation source are now independent. On this configured machine, the editor starts with **LIVE YOUCAM · SAMPLE PHOTOS · uses credits**. Load sample photo, select/load a garment, then Try it on sends those photos through the protected proxy to the real API. Use illustrations explicitly selects the free simulated route. No generation runs automatically at startup.

The separate revocable proxy credential is retained in Lens Studio's local preview persistent storage, under a key independent of the shopping list. The cache is used only in editor preview and only for the exact same HTTPS origin. The provider API key remains server-only. The saved scene and repository contain no actual proxy credential. Clearing the shopping list does not clear this local operator configuration.

## Observed checks

- `storetryon-live-default`, record: passed, with the authored credential field empty.
- `storetryon-live-default`, verify: passed after a new preview runtime; the live default and local credential survived the reset. A different origin did not receive the cached credential.
- `storetryon-guard-retry`: passed in explicitly selected illustration mode, with no provider request.
- `storetryon-live-ui`: passed through the actual UIKit/SIK controls and `StoreTryOnMain`. One real shirt generation returned a decoded **1024×1536** image, and Add to shopping list persisted both JPEG thumbnails. The request-and-save portion took **20.961 seconds**.
- The saved entry records `generatedByYouCam: true` and `syntheticInputs: true`, so a real result from synthetic photos is not mislabeled as an illustration or as a real shopper capture.

[results.json](results.json) and [Lens-side manager evidence](runtime-evidence.txt) record these outcomes. [normal-ui-live-result.png](normal-ui-live-result.png) shows the real generated image in the normal capture/result page after saving.

These remain synthetic input photos in editor preview. Hardware capture, physical-device networking, and a real shopper's photo are not verified by this test. Local preview configuration must be seeded separately on another machine; it is deliberately absent from source control. Both paid LEAF scenarios default to refusing generation until explicitly enabled.

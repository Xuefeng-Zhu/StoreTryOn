# SPECS preview networking verification

Verified on November 1, 2026 (America/Los_Angeles), in **Lens Studio 5.23.2 / SPECS 27 preview**. No physical device was available; the user explicitly selected preview verification.

The test ran the actual Lens `InternetModule` and the application's `StoreTryOnProxy` against the deployed, authenticated HTTPS backend. No browser transport, mocked provider, cached output, or illustrative result was substituted.

| Check | Observed result |
| --- | --- |
| HTTPS health and JSON response | 200, `status: ok` |
| Missing proxy credential | 401 |
| Incorrect proxy credential | 401 |
| Valid credential with intentionally invalid request | 400, `invalid_category`; no generation |
| Real shirt generation from synthetic input textures | passed |
| Shopper/garment encoded input sizes | 249868 / 406512 Base64 characters |
| Returned image | 1024×1536, 215092 JPEG bytes |
| Lens request → polling → decode time | 14.973 seconds |
| LEAF outcomes | `storetryon-network-probe` passed; `storetryon-live-network` passed |
| Mode-switch/retry regression after capture cleanup | passed |

The runtime decoded the response into a native Texture, checked JPEG/PNG signatures and dimensions, and recorded a byte checksum. The two JSON input images were encoded from the same labeled synthetic fixtures used elsewhere in preview. This was one new, real YouCam Clothes V4 shirt request. See [results.json](results.json) and [authoritative runtime evidence](runtime-evidence.txt).

Backend: [protected HTTPS proxy](https://prod-network-verification-you-1e514f-00y9mk947ef.compute.instacloud-edge.com/healthz), deployed on InstaCloud Free with scale-to-zero, one shared CPU, 256 MB, and no volume. [Deployment metadata](../../Backend/deployment.json) records the scope and observed health/auth results.

The YouCam provider key lives only in server secrets. A separate revocable proxy credential was loaded transiently for verification, then cleared before saving the scene. The public URL is configured in the scene. Local operator configuration remains outside the Lens assets and Git repository with restrictive permissions. No credentials were printed or recorded in these artifacts. The private InstaCloud CLI context was also moved outside `Assets/`.

The live LEAF scenario is opt-in: `confirmLiveRequest` defaults to `false`, because a run consumes a provider request. Credentials never appear in scenario parameters. Ordinary sample-mode UI actions still use labeled illustrations and do not start paid API jobs.

The CameraModule still-photo implementation was migrated from deprecated `requestImage` to supported `CaptureSession` APIs verified against this project's type declarations. It compiles, and mode-switch/retry regression passes. This does **not** establish hardware camera behavior. Current Snap documentation describes Transparent Permission for camera plus internet; no Extended Permissions or experimental flags were enabled by this change.

Not established: physical SPECS networking, real camera capture, a real shopper-photo result, physical hand comfort, or persistence across actual device relaunches. Hardware validation remains a separate acceptance run.

Expected negative-authentication requests produce `Host requires authentication` warnings in the editor's network log. The LEAF plugin also emits its existing settings-load warning during some resets. Both scenarios have authoritative Lens-side `PASSED` records.

## Official references

- [Internet access and preview requirement](https://developers.snap.com/spectacles/about-spectacles-features/apis/internet-access)
- [Transparent Permission](https://developers.snap.com/spectacles/permission-privacy/transparent-permission)
- [Camera module and capture sessions](https://developers.snap.com/spectacles/about-spectacles-features/apis/camera-module)

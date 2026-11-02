# StoreTryOn

A SPECS Lens for clothing-store shoppers: capture a shirt or jacket, try it on using a reusable shopper photo, and save the garment and try-on preview in a device-local shopping list.

Open `StoreTryOn.esproj` in Lens Studio 5.23.2 or newer. This project targets SPECS and uses Spectacles Interaction Kit and UIKit. It is not a browser application.

The Lens implements camera capture, photo-based try-on through a protected proxy, and a persistent local shopping list. Editor preview starts in visibly labeled sample mode; hardware starts in live mode. Provider credentials must never be embedded in the Lens or committed.

## Try the preview

1. Open the project with its bundled SIK 2.0.0, UIKit 2.0.0, and LEAF 2.0.2 packages. Preview a SPECS device. Keep these compatible package versions; newer package namespaces differ.
2. Pinch **Capture my photo** to load the labeled synthetic shopper fixture.
3. Choose **Shirt** or **Jacket**, then **Capture garment**.
4. Pinch **Try it on**, then **Add to shopping list**. The sample result is explicitly an illustration, not a live provider request.
5. Open **Shopping list**, browse, or select **Clear list** twice to confirm. Back or another action cancels clear confirmation.

On hardware, photograph your own front-facing full-body photo from another display or print once per visit, then photograph garments with the world camera. The original shopper photo stays in memory for the visit. Saved entries retain actual garment/result JPEG thumbnails on the device until cleared; temporary provider URLs are never used as persistent image storage. The default limit is six entries, subject to the runtime's available storage, with no automatic eviction. Preview reported a 100 KB quota.

## Verification

- Nine LEAF preview scenarios pass, including actual UIKit/SIK controls, both sample garment categories, shopper-photo reuse, guards/retry, duplicate prevention, navigation, image-byte persistence across preview resets, and clear confirmation/restart behavior.
- The corrected IK test activates Shopping list through a far-field hand ray with zero diagnostics. Direct touch and physical-device ergonomics remain unverified.
- Eleven backend tests pass using mocked provider transport and local HTTP.
- Two real standalone YouCam adapter calls succeeded from synthetic inputs: shirt `upper_body` in 16.52 seconds and jacket `outer` in 25.50 seconds. Both generated JPEGs were downloaded and inspected.

See [preview results and earlier failed attempts](Assets/Evidence/README.md) and [real API evidence](Assets/LiveEvidence/README.md). A compile pass alone is not runtime proof.

## Remaining setup

Deploy [Assets/Backend](Assets/Backend/README.md) behind HTTPS with a server-only `YOUCAM_API_KEY` and a separate, revocable proxy token. Set `proxyBaseUrl` and `proxyAccessToken` on StoreTryOnMain. Those Lens fields are currently empty. Do not put the YouCam key in the Inspector or in `Assets/`.

Lens-to-proxy networking, real shopper-photo input, world-camera capture, physical hand tracking, and persistence across SPECS app/device sessions still require verification. Wearable judge access is unresolved. No Lens publishing or Devpost submission has been performed.

- [SPECS design brief](devpost/design-brief.md)
- [Verified YouCam V4 contract and setup gaps](devpost/youcam-integration.md)
- [Backend setup](Assets/Backend/README.md)

The repository is private. Generated editor caches, scoped plugin extraction, local MCP configuration, and `.env*` secrets are excluded from Git.

---
status: implementation
platform: Specs
---

# StoreTryOn SPECS design brief

## Approved product decisions

A shopper in a clothing store photographs a shirt or jacket, tries it on using their own photo, and adds it to a shopping list. Reuse the shopper photo for subsequent items during a visit. The list persists on the device until the shopper clears it. Every saved item includes the garment photo and generated try-on preview.

The target is a **SPECS Lens**, built in Lens Studio 5.23.2 from the genuine SPECS Base Template. All previous browser, IndexedDB, mobile web, phone-only UI, and web-testing plans are superseded. Implementation is explicitly authorized; no additional generic design sign-off is required.

## SPECS implementation defaults

The following are implementation defaults, rather than additional user decisions:

- Use a movable spatial UIKit panel with standard SIK hand interactions. Arrange status, image cards, and buttons through UIKit layouts. Keep garment capture, photo-based try-on, and Add to shopping list as the primary actions.
- For the shopper image, use the glasses' world camera to photograph the shopper's existing front-facing full-body photo displayed on another screen or as a print. This is a photo-of-a-photo input, not an unsupported glasses selfie camera. Provide a replace-photo action; keep the original shopper photo in memory for the current Lens visit.
- Photograph one front-facing garment with the world camera. Select Shirt or Jacket, review the captured image, and allow a retake. Explain that the frame should contain a single unobstructed garment.
- Offer an explicitly labeled sample mode for editor preview. Synthetic fixtures and simulated capture must remain visibly identified; they do not prove real camera or YouCam behavior.
- Explain before sending that the two photos go through the StoreTryOn proxy to YouCam. An explicit Try it on action starts processing. Show progress, errors, and retry. Do not silently substitute a sample result for a failed live call.
- Save encoded JPEG image bytes and item metadata using the Lens runtime's device-local persistent storage. Do not depend on temporary result links. Retain the original shopper photo only for the visit; saved previews still contain the shopper's likeness.
- Bound the local list by available device storage. Reject a save with a clear capacity message when it cannot fit; do not silently evict existing entries. Provide a paged list, inspect-item view, and a confirmed Clear list action.
- Clearing removes the local entries and their image bytes. Device/app data removal or uninstall may also remove local storage. Clearing does not imply deletion of provider-held files.

## Main flow

1. Capture the shopper's own photo once, or choose labeled sample inputs in preview.
2. Select Shirt or Jacket and capture the garment. Review or retake.
3. Select **Try it on**. Send the photos only after the processing explanation. Reuse the same shopper photo for later garments.
4. View the resulting photo, then choose **Add to shopping list**.
5. Capture another garment, or open **Shopping list** to browse saved garment/result pairs.
6. Clear the list through a confirmation. Canceling must preserve it.

## YouCam integration

Use Clothes V4: `upper_body` for shirts and `outer` for jackets. The jacket category layers outerwear over the existing outfit. A controlled HTTPS proxy owns the provider API key, registers and uploads images, creates and polls the task, and downloads the completed result. The Lens receives encoded image bytes rather than retaining an expiring provider URL.

The proxy uses a separate revocable access token for this prototype, bounded uploads/jobs/polling, and sanitized errors. This prototype token can be extracted from a Lens and must not be treated as a provider secret or a production identity system. A public release needs user authentication and operational abuse controls.

The user supplied an external credential location during implementation; no provider key was copied into this project. Real backend requests succeeded for a shirt (`upper_body`, 16.52 seconds) and jacket (`outer`, 25.50 seconds), using synthetic input photos. Downloaded results and sanitized request-status evidence are in [Assets/LiveEvidence](../Assets/LiveEvidence/). A protected HTTPS proxy is now deployed on InstaCloud Free. Actual Lens `InternetModule` HTTPS/authentication and a live shirt upload/poll/decode passed in SPECS 27 preview, returning a 1024×1536 image in 14.973 seconds. The public URL is configured; the separate demo credential is kept outside saved source. Physical-device networking, camera capture, and the shopper's own photo remain unverified. See [network proof](../Assets/Evidence/network-preview/README.md) and [integration notes](youcam-integration.md).

## Done criteria and evidence

| Criterion | Preview-checkable evidence | Device/live evidence required |
| --- | --- | --- |
| Capture a shirt or jacket and see the selected garment | Labeled simulated capture, category selection, review and retake | Glasses camera, real store lighting and image framing |
| Try it on using the shopper photo | State guards, shopper reuse, progress/error/retry, labeled sample result | Real YouCam request and generated result for both categories |
| Add an item with both photos | Actual UIKit interaction and saved image bytes | Storage capacity and usability on SPECS |
| Reopen and retain the list | Reconstruct storage and reset preview without clearing; verify encoded images | Quit and relaunch on physical SPECS, including offline re-display |
| Clear and remain empty | Cancel/confirm behavior, storage reload and preview reset | Quit/relaunch on physical SPECS |
| Spatial usability | Actual preview inspection, SIK controls, LEAF interaction/reach scenarios | Real hand tracking, comfort, panel placement and readability |

Write and run meaningful LEAF scenarios for the preview-checkable behavior. Inspect actual preview pixels and runtime logs. Compilation alone is insufficient. Report exact passes, blockers, and unverified hardware behavior; no sample output is live API evidence.

## Event constraints

Intended event: [YouCam API Skin AI & eCommerce Hackathon](https://youcam-api-skin-ai-ecommerce.devpost.com/). Verified deadline: **November 2, 2026, 8:45 AM America/Los_Angeles**.

The overview's web/mobile wording does not confirm SPECS eligibility. The official rules discuss wearable hardware and permit organizers to request physical access. Preserve SPECS as the target and describe wearable judge access as unresolved until confirmed. A functioning judge-accessible demo, source/assets/setup instructions, and a public 1–3 minute video showing the intended device are submission requirements to plan for. Publishing or submitting requires a separate user instruction.

## References

- [Official rules](https://youcam-api-skin-ai-ecommerce.devpost.com/rules)
- [Clothes V4 reference](https://docs.perfectcorp.com/reference/ai_clothes/v4.0)
- [Input specifications](https://docs.perfectcorp.com/reference/ai_clothes/section/overview/file-specs-and-errors)
- [File retention](https://docs.perfectcorp.com/develop/file_retention_period)
- [SPECS internet access](https://developers.snap.com/spectacles/about-spectacles-features/apis/internet-access)

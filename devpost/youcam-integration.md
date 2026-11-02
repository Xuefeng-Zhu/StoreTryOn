# YouCam Clothes V4 integration notes

Verified against official documentation on November 1, 2026 (America/Los_Angeles). The implementation contract below is now backed by two successful standalone backend calls with synthetic inputs; the evidence boundary and remaining Lens/device checks are recorded under Current setup evidence.

## Server-side contract

Base URL: `https://yce-api-01.makeupar.com`. Provider calls use `Authorization: Bearer <YOUCAM_API_KEY>` and JSON content type. The API key belongs only in the proxy's server environment.

1. Create upload slots: `POST /s2s/v2.0/file`.

```json
{"files":[{"content_type":"image/jpg","file_name":"shopper.jpg","file_size":123456},{"content_type":"image/jpg","file_name":"garment.jpg","file_size":123456}]}
```

2. For each returned file, upload the raw JPEG/PNG bytes using the response's `requests[].url`, `method`, and `headers`. Start the task only after the uploads succeed. Keep the returned `file_id`.

The overview example wraps file entries in `data.files`, while the File API reference/OpenAPI rendering shows top-level `files`. Accept both shapes and reject a missing or incomplete upload descriptor. Do not log signed upload URLs or image bodies. [File API reference](https://docs.perfectcorp.com/reference/file/paths/~1s2s~1v2.0~1file/post), [File OpenAPI](https://docs.perfectcorp.com/_bundle/reference/file.json?download=).

3. Create task: `POST /s2s/v2.0/task/cloth-v4`.

```json
{"src_file_id":"SHOPPER_FILE_ID","ref_file_id":"GARMENT_FILE_ID","garment_category":"upper_body","filter_multi_person":"normal"}
```

Use `upper_body` for a shirt and `outer` for a jacket. Publicly accessible `src_file_url` and `ref_file_url` are alternatives to uploaded IDs. Supply one source and one reference selector. A successful create response contains `data.task_id`.

4. Query `GET /s2s/v2.0/task/cloth-v4/{task_id}` with the provider authorization header. Poll approximately every 10 seconds, with a bounded overall timeout. A successful task has `data.task_status: "success"` and `data.results.url`. [V4 reference](https://docs.perfectcorp.com/reference/ai_clothes/v4.0), [integration overview](https://docs.perfectcorp.com/reference/ai_clothes/section/overview).

The task-state enum is `running`, `success`, `error`. Errors can include `data.error` and `data.error_message`. HTTP errors include invalid credentials (401), bad parameters/insufficient credits (400, including `CreditInsufficiency`), rate limits (429), and provider timeout (500). Fail explicitly and leave a retry path; a sample image must never silently replace a failed live request. [Clothes OpenAPI](https://docs.perfectcorp.com/_bundle/reference/ai_clothes.json?download=).

`outer` renders a jacket or vest over the shopper's existing outfit. Each request handles one garment category. Official release guidance quotes two units per V4 image. The two successful calls below establish that usable credits were available for those calls; the remaining account balance was not inspected. [V4 outerwear release](https://www.perfectcorp.com/business/blog/ai-clothes/ai-clothes-try-on-api-v4-outerwear).

## Image preparation

JPEG/PNG, below 10 MB per image, 4096 px maximum side; 1024×768 recommended and 512×384 minimum in the specification table. Use a single front-facing shopper with visible face/shoulders and enough torso for the selected garment. Use a clear, front-facing, unobstructed shot of one garment. Do not use a shirt-and-pants composite. The overview asks for full-body photos, while the table describes a chest-up crop; for shirt/jacket validation, use a front-facing torso/full-body photo with the complete intended replacement region visible. The error table's 128 px lower bound is less conservative than the recommendation table and should not drive capture defaults. [File specifications](https://docs.perfectcorp.com/reference/ai_clothes/section/overview/file-specs-and-errors).

## Retention and shopping-list requirement

Provider download links last two hours. Current retention guidance states uploaded/generated files, file IDs, and task IDs last 30 days; a task ID can retrieve a fresh download link. An older task response description still mentions 24 hours, so local persistence must not depend on task or file IDs. Download the result immediately and save actual encoded garment/result bytes in the Lens's persistent on-device store. Clearing that store does not claim deletion of provider-held images. [Current file retention](https://docs.perfectcorp.com/develop/file_retention_period).

## SPECS network and security architecture

Use the Lens `InternetModule` with HTTPS requests to a controlled backend, not a provider key embedded in the Lens. Snap officially supports HTTPS fetch; Preview requires Device Type Override = Spectacles. HTTP needs Experimental APIs and prevents publication. Fetch response bytes/text/JSON are available; browser `Blob`, `FormData`, and `arrayBuffer` are not reliable supported interfaces here. JSON with base64 JPEG input is a suitable small prototype transport to the proxy. [Snap internet access](https://developers.snap.com/spectacles/about-spectacles-features/apis/internet-access).

Implemented prototype proxy: bearer-authenticated `POST /v1/tryons` accepts two bounded base64 image payloads plus `shirt`/`jacket`, maps categories server-side, uploads to YouCam, and returns an opaque random job ID. `GET /v1/tryons/{id}` returns status and downloaded image bytes/base64. Request sizes, job lifetime/concurrency, polling, and new-job rate are bounded; `DELETE /v1/tryons/{id}` removes the memory record. The independent revocable demo token keeps the provider key off-device, but is extractable from a packaged Lens and does not identify individual users. This controlled demo server has no user-account isolation; a public release needs individual authenticated users and per-user authorization/quotas. See [backend setup and contract](../Assets/Backend/README.md).

Snap Cloud Edge Functions are another server-side route if this account has access. Official Snap documentation still labels Snap Cloud alpha and requires approved access; it cannot be presumed configured. [Snap Cloud overview](https://developers.snap.com/spectacles/about-spectacles-features/snap-cloud/overview).

## Current setup evidence and missing setup

- The user supplied an existing external private credential file. It was read only into the opt-in proof process; its path, key values, and file contents are not stored in this repository or Lens.
- On November 1, 2026 (America/Los_Angeles), the real backend adapter completed **one shirt request** (`upper_body`) in **16.52 seconds** and **one jacket request** (`outer`) in **25.50 seconds**. Both used the synthetic 1024×1536 shopper/garment fixtures under `Assets/Samples/`; both returned 1024×1536 JPEG images after real registration, uploads, task submission, and polling.
- Actual signed uploads and output downloads used the already allowlisted `yce-us.s3-accelerate.amazonaws.com` host. No allowlist expansion or generation retry was needed. Exactly one successful generation per category was requested.
- Sanitized HTTP/task status evidence is in [shirt proof](../Assets/LiveEvidence/shirt-live-proof.json) and [jacket proof](../Assets/LiveEvidence/jacket-live-proof.json). Downloaded generated bytes and their provenance are described in [live evidence](../Assets/LiveEvidence/README.md). No API credential, signed storage URL, private credential location, or provider task ID is included.
- The eleven regular backend tests use mocked provider transport and a real ephemeral local HTTP server. They separately cover protocol/category mapping, authentication, image validation, URL restrictions, failure/timeout handling, result expiry/deletion, and concurrency/rate limits. These tests do not spend provider credits.
- **Now verified:** a protected HTTPS proxy is deployed on InstaCloud Free with server-only provider credentials and an independent demo token. The actual Lens `InternetModule` passed HTTPS/authentication and a real shirt upload/poll/decode in SPECS 27 preview (14.973 seconds, 1024×1536 JPEG). [Network evidence](../Assets/Evidence/network-preview/README.md). The public URL is configured, while the demo credential was cleared before saving the scene and remains in private operator configuration outside the source tree.
- **Still unverified:** physical SPECS networking, camera capture, a real shopper's own-photo result, and device relaunch persistence. The user selected preview-only networking verification because no physical device was available.
- **Still unverified on SPECS hardware:** real shopper-photo/garment capture and permission/consent flow, in-store image quality, live Lens API delivery, and shopping-list persistence across actual device Lens sessions. Labelled illustrative sample mode remains separate from the real provider output files.

## Event access constraints

Deadline remains November 2, 2026 at 8:45 AM America/Los_Angeles (11:45 AM Eastern). Overview wording says web/mobile prototype. The detailed rules nevertheless explicitly address wearable/proprietary hardware and reserve a right to request physical access. This is not a confirmed acceptance of SPECS; do not change target silently. Provide a test build/functioning demo free through judging, a repository with source/assets/instructions, and a public 1–3 minute video including the application working on its intended device. Judges may rely solely on submitted text/images/video. No submission or publication is authorized by this implementation task. [Event overview](https://youcam-api-skin-ai-ecommerce.devpost.com/), [official rules, Project Requirements and Testing](https://youcam-api-skin-ai-ecommerce.devpost.com/rules).

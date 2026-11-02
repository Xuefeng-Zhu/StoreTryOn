# YouCam Clothes V4 integration notes

Verified against official documentation on November 1, 2026 (America/Los_Angeles). This is an implementation contract, not evidence of a successful live API request.

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

`outer` renders a jacket or vest over the shopper's existing outfit. Each request handles one garment category. Official release guidance quotes two units per V4 image; available credit balance still needs confirmation in the account. [V4 outerwear release](https://www.perfectcorp.com/business/blog/ai-clothes/ai-clothes-try-on-api-v4-outerwear).

## Image preparation

JPEG/PNG, below 10 MB per image, 4096 px maximum side; 1024×768 recommended and 512×384 minimum in the specification table. Use a single front-facing shopper with visible face/shoulders and enough torso for the selected garment. Use a clear, front-facing, unobstructed shot of one garment. Do not use a shirt-and-pants composite. The overview asks for full-body photos, while the table describes a chest-up crop; for shirt/jacket validation, use a front-facing torso/full-body photo with the complete intended replacement region visible. The error table's 128 px lower bound is less conservative than the recommendation table and should not drive capture defaults. [File specifications](https://docs.perfectcorp.com/reference/ai_clothes/section/overview/file-specs-and-errors).

## Retention and shopping-list requirement

Provider download links last two hours. Current retention guidance states uploaded/generated files, file IDs, and task IDs last 30 days; a task ID can retrieve a fresh download link. An older task response description still mentions 24 hours, so local persistence must not depend on task or file IDs. Download the result immediately and save actual encoded garment/result bytes in the Lens's persistent on-device store. Clearing that store does not claim deletion of provider-held images. [Current file retention](https://docs.perfectcorp.com/develop/file_retention_period).

## SPECS network and security architecture

Use the Lens `InternetModule` with HTTPS requests to a controlled backend, not a provider key embedded in the Lens. Snap officially supports HTTPS fetch; Preview requires Device Type Override = Spectacles. HTTP needs Experimental APIs and prevents publication. Fetch response bytes/text/JSON are available; browser `Blob`, `FormData`, and `arrayBuffer` are not reliable supported interfaces here. JSON with base64 JPEG input is a suitable small prototype transport to the proxy. [Snap internet access](https://developers.snap.com/spectacles/about-spectacles-features/apis/internet-access).

Recommended proxy shape (application design): authenticated `/tryon` accepts two bounded image payloads plus `shirt`/`jacket`; maps categories server-side; uploads to YouCam; returns an opaque job ID; `/tryon/{jobId}` checks only the caller's own job; server downloads the result and returns image bytes/base64. Bound request sizes, job lifetime/concurrency, polling and spend; avoid a public unlimited shared-key relay. A per-install short-lived demo token is preferable to shipping the provider key, but is still extractable and must be revocable/rate-limited. A real user session is preferable for a public release.

Snap Cloud Edge Functions are another server-side route if this account has access. Official Snap documentation still labels Snap Cloud alpha and requires approved access; it cannot be presumed configured. [Snap Cloud overview](https://developers.snap.com/spectacles/about-spectacles-features/snap-cloud/overview).

## Current setup evidence and missing setup

- Project scan found no `.env*` files and no YouCam/Perfect-named credential files.
- Current shell environment has no names containing `YOUCAM`, `PERFECT`, or `YCE_`.
- This is a narrow absence check, not proof that the user has no account or credentials elsewhere. Credential values were neither printed nor searched broadly in the home directory.
- Missing for live proof: usable server-only `YOUCAM_API_KEY`, credits for at least one shirt and one jacket render, a deployed reachable HTTPS proxy, and a supported demo authorization configuration. Real shopper-photo input and photo-upload consent must also be exercised on hardware. Local proxy implementation and labelled samples can proceed independently.

## Event access constraints

Deadline remains November 2, 2026 at 8:45 AM America/Los_Angeles (11:45 AM Eastern). Overview wording says web/mobile prototype. The detailed rules nevertheless explicitly address wearable/proprietary hardware and reserve a right to request physical access. This is not a confirmed acceptance of SPECS; do not change target silently. Provide a test build/functioning demo free through judging, a repository with source/assets/instructions, and a public 1–3 minute video including the application working on its intended device. Judges may rely solely on submitted text/images/video. No submission or publication is authorized by this implementation task. [Event overview](https://youcam-api-skin-ai-ecommerce.devpost.com/), [official rules, Project Requirements and Testing](https://youcam-api-skin-ai-ecommerce.devpost.com/rules).

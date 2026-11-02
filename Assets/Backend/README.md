# StoreTryOn YouCam proxy

This is the server half of the SPECS Lens integration. It uses the current YouCam Clothes V4 upload/task/poll/download protocol. The YouCam key exists only in server environment configuration. It must never be embedded in the Lens, Inspector, sample data, source repository, or a packaged asset.

**Current verification:** all eleven mocked-transport/local HTTP tests pass. The standalone adapter completed real Clothes V4 shirt/jacket requests from synthetic fixtures, with outputs in `Assets/LiveEvidence/`. The protected HTTPS deployment is running on InstaCloud Free. Subsequently, the actual Lens `InternetModule` passed HTTPS/authentication and one live shirt upload/poll/decode in SPECS 27 preview (14.973 seconds, 1024×1536 JPEG). [Network evidence](../Evidence/network-preview/README.md). Physical-device networking, camera capture, and device relaunch persistence remain unverified. Labeled illustrative sample-mode outputs remain separate from real provider responses.

## Required setup

1. A privately supplied external credential passed the standalone proof. Inject that credential into the deployment through the hosting service's secret manager; never copy the private credential file into the Lens project. Account/credit administration is available in the [YouCam developer console](https://yce.perfectcorp.com/).
2. Deploy this directory as a private Node 22+ service behind an HTTPS ingress. Configure secrets through the hosting service's secret manager: `YOUCAM_API_KEY` and a separate, randomly generated `STORETRYON_PROXY_TOKEN` of at least 32 characters. Use a demo-specific token and rotate it after the demo. Do not place credential files inside Lens `Assets/`.
3. Run `npm start` from this directory. The server defaults to `127.0.0.1:8787`. A container host that requires listening on all interfaces must set `HOST=0.0.0.0`; use the host's `PORT`. Keep port 8787 private behind the TLS ingress. The Node service itself serves HTTP and must not be exposed directly to the internet.
4. Set the Lens proxy base URL to the public **HTTPS** origin and its proxy bearer token to the separate demo token. InternetModule must be permitted in the Lens; Lens Studio preview must simulate SPECS. The YouCam API key is never entered in the Lens.
5. Standalone and SPECS 27 preview networking proof have passed with synthetic inputs. Next verify physical SPECS networking and authorized real camera captures. Keep device outcomes separate from preview, standalone-adapter, and illustrative sample evidence.

The default signed-media hostname allowlist is `yce-us.s3-accelerate.amazonaws.com`, which appears in the official upload and result examples for the `yce-api-01.makeupar.com` integration. If an actual legitimate provider response uses another host, confirm the host with the provider and add its **exact** name to the server-only comma-separated `YOUCAM_MEDIA_HOSTS` configuration. No wildcards, redirect following, IP literals, local DNS targets, or client-supplied URLs are accepted.

A bundled proxy demo token can be extracted from a Lens package. This token restricts provider credit use and keeps the provider key off-device; it is not end-user identity. This service is appropriate for a controlled prototype/demo, with short-lived token access, bounded concurrency, and rate limits. Public multi-user deployment needs individual authenticated users and per-user authorization/quotas before exposure.

## Lens contract

Every `/v1/` request requires:

```text
Authorization: Bearer <STORETRYON_PROXY_TOKEN>
```

Start a try-on:

```text
POST /v1/tryons
Content-Type: application/json
```

```json
{
  "shopperImageBase64": "<canonical JPEG/PNG base64 without a data URL prefix>",
  "garmentImageBase64": "<canonical JPEG/PNG base64 without a data URL prefix>",
  "category": "shirt"
}
```

Use `shirt` or `jacket` only. The server maps these to YouCam `upper_body` and `outer`, respectively, and sends `filter_multi_person: "normal"`. Inputs are limited to 8 MiB each, dimensions at most 4096 on either side, and at least 512 on the long side / 384 on the short side. Prefer 1024×768 (or portrait equivalent), a clear single person, and one clear front-facing garment. The server checks file signatures and dimensions before submission; YouCam performs semantic image validation.

The response is HTTP 202:

```json
{"id":"<32-character random identifier>","status":"processing"}
```

Poll `GET /v1/tryons/<id>` about every two seconds. The proxy polls YouCam every ten seconds and stops after four minutes. Responses use `status: "processing"`, `"success"`, or `"error"`. A success contains the downloaded image bytes:

```json
{
  "id": "<identifier>",
  "status": "success",
  "previewImageBase64": "<base64 JPEG/PNG bytes>",
  "previewMimeType": "image/jpeg"
}
```

The Lens must persist image bytes for saved list entries; it must not save a temporary provider URL. Responses have `Cache-Control: no-store`. `DELETE /v1/tryons/<id>` cancels/removes the memory record and is useful after a successful download. `GET /healthz` is an unauthenticated process-health check.

Error responses contain short codes only, for example `unauthorized`, `invalid_category`, `image_too_small`, `capacity_reached`, `provider_authorization_failed`, `provider_credits_required`, `provider_rate_limited`, `generation_failed`, or `generation_timed_out`. No provider body, signed URL, API key, or photo data is returned in an error. A failed job is reported by HTTP 200 with `status: "error"` and an `error` code; invalid start requests use HTTP 4xx.

The default limits are two concurrent generation jobs, six new jobs per minute, and twelve retained job records. Accepted job IDs are random and accessible only with the demo bearer token. There are no user accounts or cross-user identity boundaries in this prototype.

## Photo handling and limits

Photos are sent to the proxy and then YouCam only after the wearer selects the Lens upload action. The proxy keeps inputs in memory while a job runs; it does not write photo files or log bodies. Output bytes and sanitized job state are retained in process memory for fifteen minutes after completion, unless explicitly deleted, and disappear on process restart. Local Lens list clearing does not imply deletion of YouCam-held files. Follow the provider's [retention policy](https://docs.perfectcorp.com/develop/file_retention_period) for upstream handling.

Memory records are intentionally ephemeral. A restart loses in-flight jobs. This prototype does not automatically retry submission, because that can duplicate credit charges. A user can explicitly retry a failed operation. Persistent job queues, multi-instance coordination, per-user login, and production abuse prevention are outside this demo server's scope.

All outbound media URLs come from the authenticated provider response, pass an exact host allowlist, use HTTPS without redirects, and resolve to a public address pinned to the actual socket DNS lookup. Uploads do not forward the provider Authorization header to storage. Response sizes, request bodies, headers, job counts, and durations are bounded.

## Verification

```sh
npm test
```

The tests use generated PNG inputs, a mocked YouCam transport, and an actual ephemeral loopback HTTP server. They cover both category mappings, both documented upload-response envelopes, upload/task/poll/result byte handling, auth, input limits, private-media URL rejection, provider failures (including the official HTTP400 `CreditInsufficiency` response), redirect rejection, finite polling, expiry/deletion, concurrency, and rate limits. The `npm test` suite does not call YouCam. Separate opt-in live proof uses `test/live-proof.mjs`; it reads a supplied private `.env` path internally and records only sanitized status/timings plus generated bytes. It skips an existing successful category to avoid duplicate paid requests. The completed standalone proof is recorded in `Assets/LiveEvidence/`.

## Official documentation

- [Clothes V4 overview](https://docs.perfectcorp.com/reference/ai_clothes/section/overview)
- [Clothes V4 file specifications and errors](https://docs.perfectcorp.com/reference/ai_clothes/section/overview/file-specs-and-errors)
- [Provider file retention](https://docs.perfectcorp.com/develop/file_retention_period)

## Current HTTPS deployment

The protected proxy is deployed on InstaCloud Free, project `storetryon-proxy`, branch `network-verification`, service `youcam-proxy`. Its public origin is [the StoreTryOn proxy](https://prod-network-verification-you-1e514f-00y9mk947ef.compute.instacloud-edge.com); the unauthenticated [health check](https://prod-network-verification-you-1e514f-00y9mk947ef.compute.instacloud-edge.com/healthz) returned HTTP200 on November1,2026 America/Los_Angeles. Missing and wrong demo tokens returned HTTP401; a valid token reading an unknown job returned HTTP404. No generation request was made during deployment checks.

The service is capped at one shared vCPU/256MB, has no volume, and uses scale-to-zero with always-on off. The organization remained Free with no subscription, plan change, or overage. Only four runtime/build files (6632 compressed bytes) were uploaded. Provider and demo credentials were injected through official CLI stdin, then provided by the platform as runtime environment variables; neither is baked into the image. The private CLI project/session context is retained outside Lens `Assets/`; no host tooling credentials, provider key, or demo token are included in Lens/source assets. Future deployments run the CLI from that private context and pass this backend directory as the explicit source path.

These are host-to-proxy HTTPS checks. They do not prove a Lens InternetModule request or a physical SPECS connection. Sanitized IDs, image digest, and observed checks are in [deployment.json](deployment.json).

A subsequent [Lens-runtime verification](../Evidence/network-preview/README.md) separately passed health/authentication, actual `InternetModule` upload/polling, and native image decoding in SPECS 27 preview. That run consumed one real shirt generation. No physical-device connection was available.

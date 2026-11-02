# Fresh live HTTP-proxy check

Requested and executed on November 1, 2026, America/Los_Angeles. These were new provider requests, separate from the earlier adapter proof. The opt-in `Assets/Backend/test/live-http-proof.mjs` runner used the real `createApp` default client with synthetic shopper/garment fixtures, an ephemeral loopback HTTP listener, and an independent random proxy token. No provider transport was mocked or substituted.

- **Shirt:** the local proxy accepted the request and reported the provider job as successful after approximately 20 seconds. The new harness then incorrectly treated `image/jpg` and `image/jpeg` as different MIME types before saving the output. Its failed validation record is preserved in `http-20261101232901-d594fc/`; the fresh output image was not retained. The MIME-alias check was corrected. This shirt generation was not repeated.
- **Jacket:** the complete HTTP check passed in **38.28 seconds**. It returned a **1024×1536 JPEG**, downloaded and visually inspected. The generated navy jacket appears over the synthetic shopper's original gray top. See `http-20261101233041-7c285d/jacket-youcam-http-live.jpg` and its matching JSON evidence.
- Unauthenticated access returned **401**, authenticated job creation returned **202**, polling returned **200** with `Cache-Control: no-store`, deletion returned **200**, and a subsequent lookup returned **404**.

Exactly one fresh generation was submitted for each category. Both temporary proxy processes exited; no listener was left running. No API key, proxy token, signed URL, provider task ID, or private credential-file path was saved in these records.

This verifies real provider behavior through the local HTTP proxy. It does not establish a deployed HTTPS endpoint, Lens-to-proxy networking, physical SPECS capture, or a real shopper's own-photo result.

To run a new, credit-consuming check explicitly:

```sh
node Assets/Backend/test/live-http-proof.mjs --env-file <private-env-file> --category jacket
```

Omitting `--category` requests both shirt and jacket. Each run creates a new evidence directory and preserves earlier records. This runner is excluded from `npm test`.

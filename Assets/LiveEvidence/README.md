# Real YouCam Clothes V4 adapter proof

On **November 1, 2026, America/Los_Angeles** (UTC timestamps are recorded in JSON), the StoreTryOn backend adapter made two authorized real provider requests using the synthetic shopper and garment fixtures in `Assets/Samples/`:

| Garment | YouCam category | Result | End-to-end adapter time | Output |
| --- | --- | --- | --- | --- |
| Shirt | `upper_body` | success | 16.52 seconds | `shirt-youcam-live.jpg`, 1024×1536 |
| Jacket | `outer` | success | 25.50 seconds | `jacket-youcam-live.jpg`, 1024×1536 |

Both outputs are **real YouCam-generated images from synthetic inputs**. They were downloaded as image bytes after file registration, signed uploads, task submission, and task polling. The shirt output shows the sage shirt on the synthetic shopper; the jacket output shows navy outerwear over the shopper's original grey top. These are generated appearances, not proof of physical fit.

The matching `*-live-proof.json` files contain sanitized HTTP/task statuses, input/output paths, dimensions, byte counts, and measured timings. No API key, private `.env` contents, signed storage URL, or provider task ID was saved. Exactly one successful generation per category was requested; no automatic generation retry was made.

This evidence proves the standalone server adapter and provider account worked for these calls. **It does not prove** the Lens connected through a deployed HTTPS proxy, captured real camera photos, ran on SPECS hardware, or persisted the shopping list across device sessions. The Lens's labelled illustrative sample fixtures remain separate, unchanged files under `Assets/Samples/`.

The opt-in `Assets/Backend/test/live-proof.mjs` runner skips categories with an existing successful evidence record. It is deliberately excluded from `npm test`, whose transport is mocked.

Subsequent checks separately exercised the [local HTTP proxy](HTTP-RETEST.md) and the [actual SPECS 27 preview InternetModule path](../Evidence/network-preview/README.md). Their evidence does not replace or broaden the scope of the original adapter records above.

## References

- [YouCam Clothes V4 API](https://docs.perfectcorp.com/reference/ai_clothes/v4.0)
- [Image requirements](https://docs.perfectcorp.com/reference/ai_clothes/section/overview/file-specs-and-errors)
- [Backend contract and security/deployment setup](../Backend/README.md)
- [Synthetic-input provenance](../Samples/PROVENANCE.md)

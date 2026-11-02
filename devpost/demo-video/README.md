# StoreTryOn Remotion demo

Editable 114-second / 1920×1080 / 30 fps composition for hackathon judges. The successful recorded YouCam call is integrated. Final render QA passed; see `verification.json` and `storetryon-demo-contact-sheet.png`.

## Preview and export

```sh
npm ci
npm run dev -- --no-open --port 3100
npx tsc --noEmit
npx remotion render StoreTryOnDemo out/storetryon-demo.mp4 --codec=h264 --crf=18 --audio-codec=aac --concurrency=2
```

Composition: `StoreTryOnDemo`. Studio URL: `http://localhost:3100/StoreTryOnDemo`. Each of the eight scenes also has a connected composition. Captions are inline editable JSON on each scene's BasicCaptions node; the official Basic Captions source was copied unchanged from Remotion's component reference.

## Provenance

- `public/media/live-flow.mp4` is a 52-second Preview-only crop of the successful Lens Studio window recording, source seconds 89–141. It shows the normal SIK-driven UI, a real YouCam Clothes V4 shirt call, returned image, JPEG save, shopping list, and saved-item detail. The native UI test `storetryon-live-ui` passed.
- The generation scene uses continuous source seconds 92.8–122.8 at **1×**, enclosing the complete observed API wait and the arrival of the result. No processing footage is looped or paused.
- Very brief input actions are shown at **0.25×**, labelled on screen; added explanation holds are labelled **Paused for explanation**. Result/list footage also uses labelled holds after real recorded actions.
- `shirt-youcam-live.jpg` and `jacket-youcam-live.jpg` are earlier real YouCam outputs from synthetic inputs, identified as earlier examples in the opening. The new recorded call demonstrates a shirt. The jacket `outer` category is explained, without claiming a second call in this recording.
- Every scene labels **Lens Studio · SPECS preview**. Synthetic inputs are disclosed. No physical-device capture, fit measurement, or hardware acceptance is claimed.
- `public/audio/*.wav` is offline macOS Samantha narration. `narration/script.json` is its text source; `narration/manifest.json` records measured durations. Narration gain is 0.5 in the editable scene Audio nodes. No voice cloning, paid TTS, or music. Caption timings are editorial rather than an ASR word alignment.

Raw window recordings, previous failed attempts, credentials, and local CLI context stay outside this editable project. Only cropped preview media is bundled. Preserve that boundary when sharing.

## Packaging

Keep `src/`, `public/`, `scripts/`, `narration/*.json`, `narration/*.txt`, package files, TypeScript/Remotion configuration, storyboard, media status and verification. Exclude `node_modules/`, `.git/`, caches, narration AIFF intermediates, and raw window captures. The final MP4 is a separate delivery artifact. No upload is performed by these scripts.

## Authorization

The user explicitly requested a finished, publicly uploaded demo and chose Lens Studio recording. The Remotion router's instruction “Only render if the user is very explicit in asking for it” is satisfied. The intended audience is hackathon judges. Root owns the public upload.

## Final QA

The delivered MP4 is 114.005 seconds, 3420 frames, H264/yuv420p at 1920×1080/30fps with AAC stereo audio. Full decode and black-frame checks passed. Audio peak is −4.774 dBFS with zero decoded samples at or above full scale; all eight narration tracks fit. Sampled final typography, preview crop and provenance labels passed inspection. Subjective listening is not claimed. Optional `storetryon-demo.srt` matches the burned-in captions.

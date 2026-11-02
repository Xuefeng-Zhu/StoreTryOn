# Third-party notices and media provenance

The root [LICENSE](LICENSE) grants MIT rights only to the identified original StoreTryOn code. This repository is a mixed-license Lens Studio project. Inclusion, dependency installation or a screenshot does not transfer vendor ownership or relicense a vendor component. Preserve upstream notices and obtain/use platform software under its own terms.

## Snap platform, packages and template assets

The project uses Lens Studio and the SPECS Base Template. The tracked vendor archives are `Packages/SpectaclesInteractionKit.lspkg`, `SpectaclesUIKit.lspkg`, `Leaf.lspkg`, `AiPreviewAgentInspect.lspkg`, `Icons.lspkg`, `Motion.lspkg`, and `Bitmoji 3D.lsc`. The working compatible versions include SIK 2.0.0, UIKit 2.0.0 and LEAF 2.0.2; install other vendor components through Lens Studio as needed.

These archives, their extracted/generated contents, vendor code and assets, and template-provided scenes, materials, shaders, render resources and environment media are **not covered by StoreTryOn's MIT grant**. This includes the `Echopark.hdr` render resource. Snap and other upstream licensors retain their rights. Their package-specific terms and the [Lens Studio License Agreement](https://www.snap.com/terms/lens-studio-license-agreement) apply. This notice does not assert unrestricted public redistribution rights for vendor packages or authorize extraction/reuse outside those terms. Do not remove embedded upstream notices. Generated `Cache/` and `Support/` contents are not original StoreTryOn source.

## UI icons

The six raster icons under `Assets/Icons/` are `arrow_back`, `checkroom`, `delete`, `person`, `photo_camera`, and `shopping_bag`. They are treated as third-party UI media and excluded from the original-code MIT grant. The matching Material Symbols collection is published by Google under Apache License 2.0; retain the applicable source attribution and license when redistributing those icons. See the [Material Symbols guide](https://developers.google.com/fonts/docs/material_symbols) and [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0). No font binary is included in this directory.

## Remotion demo project

`devpost/demo-video/package.json` and its lockfile identify the exact dependency versions. The package metadata points to the scoped root license rather than describing the whole mixed-license directory as MIT.

- **Remotion 4.0.540 and related vendor packages:** Remotion core uses its own Remotion License, not the MIT license. Consult the [version-pinned Remotion license](https://github.com/remotion-dev/remotion/blob/v4.0.540/LICENSE.md) for permitted use and licensing conditions. StoreTryOn does not relicense Remotion, its derivatives or distributed vendor code. Some individual packages have different declarations; for example the installed `@remotion/captions` package declares MIT. Preserve the licenses supplied with each installed package.
- **BasicCaptions:** `devpost/demo-video/src/basic-captions.tsx` was copied unchanged from the [official Remotion Basic Captions component](https://www.remotion.dev/elements/captions/basic-captions), created by Jonny Burger, as instructed by Remotion's caption skill. [Upstream source](https://github.com/remotion-dev/remotion/blob/main/packages/docs/elements/captions/basic-captions/basic-captions.tsx). No separate component-specific MIT grant was identified. This copied vendor file is expressly excluded from StoreTryOn's MIT grant and remains subject to upstream terms.
- **React and React DOM 19.3.1:** MIT-licensed by Meta Platforms, Inc. and affiliates; preserve the [React license](https://github.com/facebook/react/blob/main/LICENSE) supplied with installed packages.
- Other development and transitive dependencies retain their package licenses. `node_modules/` is not committed. `npm ci` restores the exact lockfile dependencies and their notices; StoreTryOn's license does not replace those notices.

The original StoreTryOn composition, scene and helper code is within the scoped MIT grant; this does not turn the copied component or runtime dependencies into MIT-licensed StoreTryOn code.

## Synthetic sample fixtures

[Assets/Samples/PROVENANCE.md](Assets/Samples/PROVENANCE.md) records the full provenance and prompt set. Its five 1024×1536 PNGs were created using Codex's OpenAI image-generation tool on November 1, 2026, America/Los_Angeles. They depict a fictional adult and unbranded garments. Three are sample inputs; two are deliberately illustrative result fixtures. They are neither shopper camera captures nor YouCam-generated outputs.

These generated images are **excluded from the source-code MIT grant**. No separate public asset license is granted here. Their generation and reuse remain subject to the applicable [OpenAI terms](https://openai.com/policies/terms-of-use/) and any other relevant rights. This notice does not assert exclusivity or copyrightability of generated images. Preserve the synthetic/illustrative disclosures when showing these fixtures.

## YouCam service and generated outputs

YouCam/Perfect Corp.'s service, documentation, names and branding are separate from this project's source code. The API is governed by the [YouCam API terms](https://www.perfectcorp.com/perfectbeauty/youcam/terms-of-service-api), [documentation](https://docs.perfectcorp.com/develop/introduction) and [file-retention policy](https://docs.perfectcorp.com/develop/file_retention_period).

The generated results under `Assets/LiveEvidence/`, result-bearing evidence screenshots, and the corresponding demo media are real YouCam output from synthetic inputs. They are **excluded from the MIT grant** and included as evidence, without a separate asset redistribution license or claim that the provider's output is third-party-rights-free. The original adapter evidence is described in [Assets/LiveEvidence/README.md](Assets/LiveEvidence/README.md). An image's inclusion does not prove physical fit or actual-camera/hardware verification.

## Other audio, video and screenshots

Preview screenshots/recordings include Snap rendering, template content, UI and generated images. They are evidence assets rather than MIT-licensed source. The demo's local macOS Samantha narration, generated WAV sound effects, rendered MP4, captions/reference media and all other media are excluded from the code grant. No voice model, system font or music library asset is licensed by this repository. Local system voices/fonts and tools remain subject to their vendors' terms.

## Publication boundary

The scoped MIT grant is not a representation that all included vendor archives or media may be redistributed for any purpose. Before changing repository visibility or redistributing vendor/media assets independently, retain and review the applicable upstream terms or replace those files with documented installation steps. No provider credential, prototype access token or host CLI session is licensed or intended for distribution.

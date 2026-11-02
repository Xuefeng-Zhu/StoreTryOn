# Synthetic preview fixtures

All five PNG images in this directory were created with Codex's built-in OpenAI image generation tool on November 1, 2026 (America/Los_Angeles). They depict a fictional adult and unbranded garments. They are not camera captures, not photographs supplied by the shopper, and not results from YouCam or Perfect Corp. No live YouCam request was used to create them.

| Asset | Role | Required UI disclosure |
| --- | --- | --- |
| `shopper-synthetic.png` | Fictional shopper input | Synthetic sample shopper |
| `shirt-synthetic.png` | Sage overshirt input | Sample garment; simulated capture |
| `jacket-synthetic.png` | Navy jacket input | Sample garment; simulated capture |
| `shirt-preview-illustration.png` | Illustrative shirt result | Illustrative sample; not YouCam output |
| `jacket-preview-illustration.png` | Illustrative jacket result | Illustrative sample; not YouCam output |

Images are portrait PNGs at 1024 × 1536. The two result illustrations use the shopper image as an identity reference and the respective garment image as a garment reference. Visually inspected: single subject/garment, front-facing composition, visible face and garment, no logos or written labels. The shirt illustration changes the gray top to a sage overshirt; the jacket illustration preserves the gray top and adds an open navy jacket. These are illustrative states for exercising the UI and persistence, not quality or integration evidence for the actual provider.

## Prompt set

### Shopper generation

Use case: photorealistic-natural. Asset type: synthetic input fixture for a SPECS clothing try-on prototype, never evidence of real camera capture or YouCam output. Create a portrait-oriented catalog-style photo of one entirely fictional adult woman, about 30, with short dark curly hair, wearing a plain medium-gray crewneck T-shirt, straight neutral beige trousers and simple white shoes. Standing upright front-facing with arms slightly away from torso, shoulders, waist and full body clearly visible, face unobstructed, calm natural expression. Soft daylight, warm off-white plain studio wall and floor. Single person, no bystanders, no props. Realistic fabric and body proportions. Full body centered and occupies most of the image, sufficient margin around head and shoes. No brand logos, no visible writing. Do not create UI, collage, watermark, text labels or borders. This is a fictional synthetic test photo.

### Shirt generation

Use case: product-mockup. Asset type: synthetic garment input fixture for a SPECS clothing try-on prototype, never evidence of real camera capture. Portrait-oriented clean retail product photograph of one sage-green cotton overshirt, buttoned front, long sleeves hanging straight, a single chest pocket, matte fabric texture, on a simple wooden hanger against a warm off-white plain wall. Front view, no perspective skew. Entire single garment clearly visible and unobstructed from collar to hem and sleeve cuffs; large centered framing. Soft even daylight. No person, no hand, no store signage, no brand logos, no tags, no writing. Do not create UI, collage, watermark, text labels, or borders. This is a synthetic sample input.

### Jacket generation

Use case: product-mockup. Asset type: synthetic garment input fixture for a SPECS clothing try-on prototype, never evidence of real camera capture. Portrait-oriented clean retail product photograph of one navy-blue lightweight zip-front jacket, zip open just enough to show the interior front edges, stand collar, simple side pockets, long sleeves hanging straight, on a simple wooden hanger against a warm off-white plain wall. Front view, no perspective skew. Entire single garment clearly visible and unobstructed from collar to hem and sleeve cuffs; large centered framing. Soft even daylight, realistic matte fabric. No person, no hand, no store signage, no brand logos, no tags, no writing. Do not create UI, collage, watermark, text labels, or borders. This is a synthetic sample input.

### Shirt illustration edit

Use case: identity-preserve. Asset type: synthetic illustrative preview fixture for a SPECS clothing prototype, not a live YouCam API result. Image 1 is the edit target; Image 2 is the supporting garment reference. Change only the gray T-shirt into the sage-green overshirt shown in Image 2, worn buttoned as a shirt. Match the garment's collar, buttons, single chest pocket, sage-green cotton fabric, and sleeves. Preserve the fictional adult woman's face, hair, body identity, skin tone, pose, beige trousers, white shoes, warm off-white studio wall and floor, framing, camera and lighting from Image 1 exactly. Single portrait full-body photo; no additional people, no text, no watermark, no labels, no collage, no UI. This intentionally synthetic illustration will be visibly labelled as a sample in the app.

Image 1: `shopper-synthetic.png`. Image 2: `shirt-synthetic.png`.

### Jacket illustration edit

Use case: identity-preserve. Asset type: synthetic illustrative preview fixture for a SPECS clothing prototype, not a live YouCam API result. Image 1 is the edit target; Image 2 is the supporting garment reference. Add the navy-blue zip-front jacket from Image 2 over the gray T-shirt, worn open so a central area of the existing gray T-shirt remains visible. Match the jacket's stand collar, zipper, simple side pockets, and navy matte fabric. Preserve the fictional adult woman's face, hair, body identity, skin tone, pose, beige trousers, white shoes, warm off-white studio wall and floor, framing, camera and lighting from Image 1 exactly. Single portrait full-body photo; no additional people, no text, no watermark, no labels, no collage, no UI. This intentionally synthetic illustration will be visibly labelled as a sample in the app.

Image 1: `shopper-synthetic.png`. Image 2: `jacket-synthetic.png`.

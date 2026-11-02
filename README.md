# StoreTryOn

A SPECS Lens for clothing-store shoppers: capture a shirt or jacket, try it on using a reusable shopper photo, and save the garment and try-on preview in a device-local shopping list.

Open `StoreTryOn.esproj` in Lens Studio 5.23.2 or newer. This project targets SPECS and uses Spectacles Interaction Kit and UIKit. It is not a browser application.

The Lens implementation is in progress. Labeled sample inputs support editor preview; samples do not prove a live YouCam integration. Real try-on requires server-side YouCam credentials, credits, and a reachable HTTPS proxy. Provider credentials must never be embedded in the Lens or committed.

- [SPECS design brief](devpost/design-brief.md)
- [Verified YouCam V4 contract and setup gaps](devpost/youcam-integration.md)
- [Backend setup](Assets/Backend/README.md)

Device persistence, camera capture, hand tracking, and wearable judge access require physical SPECS verification. Preview test results will be recorded separately from hardware and live-API evidence.

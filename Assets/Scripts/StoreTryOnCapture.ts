/** The wearer photographs a displayed personal photo once, then garments in the shop. */
export class StoreTryOnCapture {
  private module: CameraModule = require('LensStudio:CameraModule')
  private stream: Texture | null = null
  private frameReady = false

  start(): void {
    if (global.deviceInfoSystem.isEditor() || this.stream) return
    const request = CameraModule.createCameraRequest()
    request.cameraId = CameraModule.CameraId.Right_Color
    request.imageSmallerDimension = 512
    this.stream = this.module.requestCamera(request)
    const provider = this.stream.control as CameraTextureProvider
    provider.onNewFrame.add(() => { this.frameReady = true })
  }

  liveTexture(): Texture | null { return this.stream }

  async capture(): Promise<Texture> {
    if (global.deviceInfoSystem.isEditor()) throw new Error('Hardware capture is unavailable in editor. Use clearly labelled Sample mode.')
    if (!this.frameReady) throw new Error('Camera is warming up. Look at the photo and capture again.')
    const request = CameraModule.createImageRequest()
    const resolutions = this.module.getSupportedImageResolutions()
      .filter(size => Math.max(size.x, size.y) >= 512 && Math.min(size.x, size.y) >= 384 && Math.max(size.x, size.y) <= 4096)
      .sort((a, b) => a.x * a.y - b.x * b.y)
    if (!resolutions.length) throw new Error('Camera has no supported resolution for try-on. Use sample mode or check device settings.')
    request.resolution = resolutions[0]
    const frame = await this.module.requestImage(request)
    return frame.texture
  }
}

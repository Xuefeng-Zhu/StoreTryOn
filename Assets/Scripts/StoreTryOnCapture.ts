/** The wearer photographs a displayed personal photo once, then garments in the shop. */
export class StoreTryOnCapture {
  private module: CameraModule = require('LensStudio:CameraModule')
  private session: CameraModule.CaptureSession | null = null
  private statusRegistration: EventRegistration | null = null
  private interrupted = false
  private capturing = false
  private generation = 0

  start(): void {
    if (global.deviceInfoSystem.isEditor() || this.session) return
    if (typeof this.module.getSupportedStreams !== 'function' || typeof this.module.createCaptureSession !== 'function') {
      throw new Error('This SPECS software does not support photo capture sessions. Update the device or use labelled Sample mode.')
    }

    const filter = new CameraModule.StreamFilter()
    filter.type = CameraModule.CameraType.Rgb
    let streams: CameraModule.StreamInfo[]
    try { streams = this.module.getSupportedStreams(filter) }
    catch (_) { throw new Error('Camera access is unavailable. Allow camera permission on SPECS, then retry.') }

    const suitable = streams.filter(stream =>
      Math.min(stream.width, stream.height) >= 512 && Math.max(stream.width, stream.height) <= 4096 &&
      (stream.imageFormat === CameraModule.ImageFormat.Jpeg || stream.imageFormat === CameraModule.ImageFormat.Yuv420))
    // Prefer the right RGB sensor and encoded JPEG. Among those, keep the
    // smallest supported photo at least 1024px long, or the largest smaller one.
    suitable.sort((a, b) => this.streamScore(a) - this.streamScore(b))
    if (!suitable.length) throw new Error('No supported color-photo stream is available at 512px or higher. Check camera permission and device software.')

    const config = new CameraModule.StreamConfig()
    config.stream = suitable[0]
    let session: CameraModule.CaptureSession
    try { session = this.module.createCaptureSession() }
    catch (_) { throw new Error('Camera capture could not initialize. Check SPECS camera permission, then retry.') }
    let result: CameraModule.Result
    try { result = session.start(config) }
    catch (_) {
      session.stop()
      throw new Error('Camera could not start. Allow camera permission on SPECS and retry.')
    }
    if (result !== CameraModule.Result.Success) {
      session.stop()
      throw new Error(this.startError(result))
    }
    this.session = session
    this.interrupted = false
    this.statusRegistration = session.onStatusChanged.add(status => {
      if (this.session !== session) return
      this.interrupted = status === CameraModule.StreamStatus.Interrupted
      if (status === CameraModule.StreamStatus.Disconnected) this.stop()
    })
  }

  /** Release the single camera pipeline on Lens teardown or when leaving live mode. */
  stop(): void {
    const session = this.session
    this.session = null
    this.interrupted = false
    this.generation++
    if (!session) return
    if (this.statusRegistration) session.onStatusChanged.remove(this.statusRegistration)
    this.statusRegistration = null
    session.stop()
  }

  async capture(): Promise<Texture> {
    if (global.deviceInfoSystem.isEditor()) throw new Error('Hardware capture is unavailable in editor. Use clearly labelled Sample mode.')
    if (this.capturing) throw new Error('A photo is already being captured. Wait for it to finish.')
    this.start()
    const session = this.session
    if (!session) throw new Error('Camera session is unavailable. Check SPECS camera permission, then retry.')
    if (this.interrupted) throw new Error('Camera access was interrupted. Wait a moment, then capture again.')
    const generation = this.generation
    this.capturing = true
    try {
      const frame = await session.capture()
      if (generation !== this.generation || session !== this.session) throw new Error('Camera session ended before the photo arrived. Capture again.')
      if (!frame || !frame.texture || !frame.imageData.length) throw new Error('Camera returned an unreadable photo. Retake it.')
      if (Math.min(frame.width, frame.height) < 512) throw new Error('Camera photo resolution is too low. Retake it using a supported device.')
      // Freeze actual sensor pixels so the shopper photo stays stable while the
      // same capture session takes subsequent garment photos during the visit.
      return ProceduralTextureProvider.createFromTexture(frame.texture)
    } catch (error) {
      if (error instanceof Error && /Camera (session|returned|photo)/.test(error.message)) throw error
      throw new Error('Photo capture failed or timed out. Check camera permission and device connection, then retry.')
    } finally { this.capturing = false }
  }

  private streamScore(stream: CameraModule.StreamInfo): number {
    const sidePenalty = stream.location === CameraModule.CameraLocation.Right ? 0 : 1e12
    const formatPenalty = stream.imageFormat === CameraModule.ImageFormat.Jpeg ? 0 : 1e10
    const area = stream.width * stream.height
    const resolutionScore = Math.max(stream.width, stream.height) >= 1024 ? area : 1e9 - area
    return sidePenalty + formatPenalty + resolutionScore
  }

  private startError(result: CameraModule.Result): string {
    if (result === CameraModule.Result.NotInitialized) return 'Camera is not ready. Check permission and wait a moment before retrying.'
    if (result === CameraModule.Result.InvalidConfig || result === CameraModule.Result.InvalidArgument) return 'This camera stream is unavailable on the device. Check SPECS software, then retry.'
    return 'Camera could not start. Check camera permission and close other camera sessions, then retry.'
  }
}

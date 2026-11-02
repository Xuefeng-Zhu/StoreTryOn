import {GarmentCategory} from './StoreTryOnState'

type ServiceErrorDetails = {message: string, retryable: boolean}
const SERVICE_ERRORS: Record<string, ServiceErrorDetails> = {
  configuration_missing: {message: 'Live try-on is temporarily unavailable. Please try again later.', retryable: false},
  unauthorized: {message: 'Live try-on is temporarily unavailable. Please try again later.', retryable: false},
  provider_authorization_failed: {message: 'Live try-on is temporarily unavailable. Please try again later.', retryable: false},
  provider_credits_required: {message: 'Live try-on is temporarily unavailable. Please try again later.', retryable: false},
  rate_limited: {message: 'Try-on is busy. Wait a moment, then try again.', retryable: true},
  provider_rate_limited: {message: 'Try-on is busy. Wait a moment, then try again.', retryable: true},
  capacity_reached: {message: 'Try-on is busy. Wait a moment, then try again.', retryable: true},
  network_error: {message: 'The connection was interrupted. Check your connection and try again.', retryable: true},
  provider_unavailable: {message: 'Try-on could not connect. Please try again in a moment.', retryable: true},
  upstream_timeout: {message: 'The preview took too long. Please try again.', retryable: true},
  generation_timed_out: {message: 'The preview took too long. Please try again.', retryable: true},
  job_cancelled: {message: 'Try-on was interrupted. Please try again.', retryable: true},
  job_not_found: {message: 'This try-on is no longer available. Please try again.', retryable: true},
  invalid_response: {message: 'The preview could not be loaded. Please try again.', retryable: true},
  result_download_failed: {message: 'The preview could not be loaded. Please try again.', retryable: true},
  invalid_image: {message: 'The photo could not be read. Retake a clear, front-facing photo.', retryable: false},
  invalid_image_base64: {message: 'The photo could not be read. Retake a clear, front-facing photo.', retryable: false},
  image_too_small: {message: 'The photo resolution is too low. Retake a higher-resolution photo.', retryable: false},
  image_too_large: {message: 'The photos are too large. Retake them at a lower resolution.', retryable: false},
  request_too_large: {message: 'The photos are too large. Retake them at a lower resolution.', retryable: false},
  image_dimensions: {message: 'The photo size is not supported. Retake your photo and the garment.', retryable: false},
  generation_failed: {message: 'These photos could not produce a preview. Retake clear, front-facing photos and try again.', retryable: false},
  image_upload_failed: {message: 'The photos could not be sent. Check your connection and try again.', retryable: true},
  invalid_category: {message: 'Choose Shirt or Jacket, then try again.', retryable: false},
  invalid_request: {message: 'Try-on could not start. Please try again later.', retryable: false},
  invalid_json: {message: 'Try-on could not start. Please try again later.', retryable: false},
  json_required: {message: 'Try-on could not start. Please try again later.', retryable: false},
  invalid_media_url: {message: 'Live try-on is temporarily unavailable. Please try again later.', retryable: false},
  media_host_not_allowed: {message: 'Live try-on is temporarily unavailable. Please try again later.', retryable: false},
  unsafe_upstream_address: {message: 'Live try-on is temporarily unavailable. Please try again later.', retryable: false},
  invalid_upload_headers: {message: 'Live try-on is temporarily unavailable. Please try again later.', retryable: false},
  invalid_upload_request: {message: 'Live try-on is temporarily unavailable. Please try again later.', retryable: false},
  invalid_upload_response: {message: 'Live try-on is temporarily unavailable. Please try again later.', retryable: false},
  invalid_task_response: {message: 'Live try-on is temporarily unavailable. Please try again later.', retryable: false},
  invalid_provider_response: {message: 'Try-on could not complete. Please try again in a moment.', retryable: true},
  provider_request_failed: {message: 'Try-on could not complete. Please try again in a moment.', retryable: true},
  request_failed: {message: 'Try-on could not complete. Please try again in a moment.', retryable: true},
  upstream_response_too_large: {message: 'The preview could not be loaded. Please try again later.', retryable: false},
  service_unavailable: {message: 'Try-on could not complete. Please try again in a moment.', retryable: true},
}

function knownErrorCode(code: unknown): string | null {
  return typeof code === 'string' && Object.prototype.hasOwnProperty.call(SERVICE_ERRORS, code) ? code : null
}

/** Safe for shopper-facing messages; code remains available for diagnostics. */
export class StoreTryOnServiceError extends Error {
  readonly code: string
  readonly retryable: boolean

  constructor(code: string) {
    const safeCode = knownErrorCode(code) || 'service_unavailable'
    const details = SERVICE_ERRORS[safeCode]
    super(details.message)
    this.name = 'StoreTryOnServiceError'
    this.code = safeCode
    this.retryable = details.retryable
  }
}

interface TryOnResponse {
  id?: unknown
  status?: unknown
  previewImageBase64?: unknown
  error?: unknown
}

interface PendingTryOn {
  id: string
  shopper: string
  garment: string
  category: GarmentCategory
  startedAt: number
  result?: string
}

const PENDING_LIFETIME_MS = 15 * 60 * 1000

function httpErrorCode(status: number, method: string): string {
  if (status === 401 || status === 403) return 'unauthorized'
  if (status === 402) return 'provider_credits_required'
  if (status === 408 || status === 504) return 'generation_timed_out'
  if (status === 413) return 'request_too_large'
  if (status === 429) return 'rate_limited'
  if (status === 404 && method === 'GET') return 'job_not_found'
  if (status === 400 || status === 415) return 'invalid_request'
  if (status >= 500) return 'provider_unavailable'
  return 'service_unavailable'
}

/** Only talks to a separate proxy token. Never contains the YouCam API credential. */
export class StoreTryOnProxy {
  private internet: Pick<InternetModule, 'fetch'>
  private pending: PendingTryOn | null = null
  private revision = 0

  constructor(private baseUrl: string, private accessToken: string, private delay: (seconds: number) => Promise<void>,
      transport?: Pick<InternetModule, 'fetch'>) {
    this.internet = transport || require('LensStudio:InternetModule')
  }

  /** Drop in-memory photos and the resumable job when visit inputs change. */
  discardPending(): void { this.revision++; this.pending = null }

  /** Boolean only; never exposes a job ID or photo bytes. */
  hasPendingJob(): boolean {
    if (this.pending && Date.now() - this.pending.startedAt >= PENDING_LIFETIME_MS) this.discardPending()
    return this.pending !== null
  }

  configured(): boolean { return /^https:\/\//.test(this.baseUrl.trim()) && this.accessToken.trim().length > 0 }

  async generate(shopper: string, garment: string, category: GarmentCategory, progress: (text: string) => void): Promise<string> {
    if (!this.configured()) throw new StoreTryOnServiceError('configuration_missing')
    const base = this.baseUrl.trim().replace(/\/+$/, '')
    this.hasPendingJob()
    if (this.pending && (this.pending.shopper !== shopper || this.pending.garment !== garment || this.pending.category !== category)) {
      this.discardPending()
    }
    const revision = this.revision
    let job = this.pending
    let terminal = false
    try {
      if (job?.result) {
        progress('Loading your preview…')
        this.assertCurrent(revision)
        return job.result
      }
      if (!job) {
        progress('Sending your photos…')
        this.assertCurrent(revision)
        // Creation is never retried: its outcome can be ambiguous after a disconnect.
        const created = await this.request(base + '/v1/tryons', 'POST', {shopperImageBase64: shopper, garmentImageBase64: garment, category})
        this.assertCurrent(revision)
        if (typeof created.id !== 'string' || !created.id || created.id.length > 256 || created.status !== 'processing') {
          throw new StoreTryOnServiceError('invalid_response')
        }
        job = {id: created.id, shopper, garment, category, startedAt: Date.now()}
        this.pending = job
      } else {
        progress('Reconnecting to your try-on…')
      }
      progress('Creating your try-on preview…')
      for (let i = 0; i < 150; i++) {
        this.assertCurrent(revision)
        if (Date.now() - job.startedAt >= PENDING_LIFETIME_MS) {
          terminal = true
          throw new StoreTryOnServiceError('generation_timed_out')
        }
        await this.delay(2)
        this.assertCurrent(revision)
        const task = await this.poll(base + '/v1/tryons/' + encodeURIComponent(job.id), revision)
        this.assertCurrent(revision)
        if (task.status === 'success') {
          progress('Loading your preview…')
          this.assertCurrent(revision)
          // Main discards only after native image decoding accepts these bytes.
          job.result = task.previewImageBase64 as string
          return job.result
        }
        if (task.status === 'error') {
          terminal = true
          throw new StoreTryOnServiceError(knownErrorCode(task.error) || 'service_unavailable')
        }
      }
      throw new StoreTryOnServiceError('generation_timed_out')
    } catch (error) {
      this.assertCurrent(revision)
      const safeError = error instanceof StoreTryOnServiceError ? error : new StoreTryOnServiceError('service_unavailable')
      if ((terminal || !safeError.retryable || safeError.code === 'job_not_found') && this.pending === job) this.discardPending()
      throw safeError
    }
  }

  private assertCurrent(revision: number): void {
    if (revision !== this.revision) throw new StoreTryOnServiceError('job_cancelled')
  }

  private async poll(url: string, revision: number): Promise<TryOnResponse> {
    for (let attempt = 0; attempt < 3; attempt++) {
      this.assertCurrent(revision)
      try {
        const task = await this.request(url, 'GET')
        this.assertCurrent(revision)
        if (task.status !== 'processing' && task.status !== 'success' && task.status !== 'error') {
          throw new StoreTryOnServiceError('invalid_response')
        }
        if (task.status === 'success' && (typeof task.previewImageBase64 !== 'string' || !task.previewImageBase64 ||
            task.previewImageBase64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(task.previewImageBase64))) {
          throw new StoreTryOnServiceError('invalid_response')
        }
        return task
      } catch (error) {
        this.assertCurrent(revision)
        const safeError = error instanceof StoreTryOnServiceError ? error : new StoreTryOnServiceError('service_unavailable')
        if (attempt === 2 || (safeError.code !== 'network_error' && safeError.code !== 'invalid_response')) throw safeError
        await this.delay(attempt + 1)
      }
    }
    throw new StoreTryOnServiceError('invalid_response')
  }

  private async request(url: string, method: string, body?: object): Promise<TryOnResponse> {
    let response: Response
    try {
      response = await this.internet.fetch(url, {
        method, headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + this.accessToken},
        ...(body ? {body: JSON.stringify(body)} : {}),
      })
    } catch (_) {
      throw new StoreTryOnServiceError('network_error')
    }
    const successful = response.status >= 200 && response.status < 300
    let payload: unknown
    try { payload = await response.json() }
    catch (_) { throw new StoreTryOnServiceError(successful ? 'invalid_response' : httpErrorCode(response.status, method)) }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new StoreTryOnServiceError(successful ? 'invalid_response' : httpErrorCode(response.status, method))
    }
    const task = payload as TryOnResponse
    if (!successful) throw new StoreTryOnServiceError(knownErrorCode(task.error) || httpErrorCode(response.status, method))
    return task
  }
}

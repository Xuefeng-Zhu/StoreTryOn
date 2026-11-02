import {GarmentCategory} from './StoreTryOnState'

/** Only talks to a separate proxy token. Never contains the YouCam API credential. */
export class StoreTryOnProxy {
  private internet: InternetModule = require('LensStudio:InternetModule')

  constructor(private baseUrl: string, private accessToken: string, private delay: (seconds: number) => Promise<void>) {}

  configured(): boolean { return /^https:\/\//.test(this.baseUrl) && this.accessToken.trim().length > 0 }

  async generate(shopper: string, garment: string, category: GarmentCategory, progress: (text: string) => void): Promise<string> {
    if (!this.configured()) throw new Error('Live try-on needs a deployed HTTPS proxy and proxy access token. Sample mode is available.')
    const base = this.baseUrl.replace(/\/+$/, '')
    const created = await this.request(base + '/v1/tryons', 'POST', {shopperImageBase64: shopper, garmentImageBase64: garment, category})
    if (!created.id || created.status !== 'processing') throw new Error('Proxy returned an invalid task. Please retry.')
    for (let i = 0; i < 150; i++) {
      await this.delay(2)
      progress('YouCam is generating your preview… ' + (i + 1) * 2 + 's')
      const task = await this.request(base + '/v1/tryons/' + encodeURIComponent(created.id), 'GET')
      if (task.status === 'success' && typeof task.previewImageBase64 === 'string') return task.previewImageBase64
      if (task.status === 'error') throw new Error(this.friendlyError(task.error))
      if (task.status !== 'processing') throw new Error('Proxy returned an unexpected task state. Please retry.')
    }
    throw new Error('Try-on timed out. Check connection and retry; this request may still complete on the server.')
  }

  private async request(url: string, method: string, body?: object): Promise<any> {
    const response = await this.internet.fetch(url, {
      method, headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + this.accessToken},
      ...(body ? {body: JSON.stringify(body)} : {}),
    })
    const payload = await response.json()
    if (response.status < 200 || response.status >= 300) throw new Error(this.friendlyError(payload.error))
    return payload
  }

  private friendlyError(code: string): string {
    const messages: Record<string, string> = {
      provider_credits_required: 'YouCam credits are unavailable. The project owner needs to add credits, then retry.',
      provider_authorization_failed: 'YouCam access needs attention on the server. Ask the project owner to check its API credential.',
      provider_rate_limited: 'YouCam is busy. Wait a moment, then retry.',
      capacity_reached: 'The try-on service is busy. Wait a moment, then retry.',
      image_too_small: 'Photo resolution is too low. Retake a clear full-size photo.',
      image_too_large: 'Photo is too large. Retake at a lower resolution.',
      invalid_image: 'The photo could not be read. Retake it and retry.',
      generation_timed_out: 'Generation took too long. Check connection and retry.',
      unauthorized: 'The proxy access token needs attention. Ask the project owner to update it.',
      provider_unavailable: 'YouCam is temporarily unavailable. Please retry later.',
      configuration_missing: 'The server needs a YouCam API credential before live try-on is available.',
    }
    return messages[code] || 'Try-on could not complete. Check connection and clearer photos, then retry.'
  }
}

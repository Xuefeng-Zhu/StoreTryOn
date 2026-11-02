import {Scenario} from 'Leaf.lspkg/Scenarios/scenario/Scenario'
import {expect} from 'Leaf.lspkg/Utils/common/Expect'
import {StoreTryOnProxy, StoreTryOnServiceError} from '../Scripts/StoreTryOnProxy'
import {encodeImage, makeThumbnail} from '../Scripts/StoreTryOnImages'
import {GarmentCategory} from '../Scripts/StoreTryOnState'
import {StoreTryOnHarness} from './StoreTryOnHarness'

type Step = {method: 'GET' | 'POST', payload?: object, status?: number, failure?: 'network' | 'json'}

/** Injected transport only: no InternetModule request or provider credit is used. */
class RecoveryTransport {
  posts = 0
  gets = 0
  readonly getIds: string[] = []
  readonly delays: number[] = []
  private index = 0

  constructor(private steps: Step[]) {}

  readonly fetch: InternetModule['fetch'] = async (request, options) => {
    const step = this.steps[this.index++]
    if (!step) throw new Error('Unexpected extra transport attempt.')
    expect(typeof request === 'string').toBe(true)
    const method = options?.method || 'GET'
    expect(method).toBe(step.method)
    if (method === 'POST') this.posts++
    else { this.gets++; this.getIds.push((request as string).split('/').pop() || '') }
    if (step.failure === 'network') throw new Error('private-transport-detail')
    return {status: step.status || 200, json: async () => {
      if (step.failure === 'json') throw new Error('private-transport-detail')
      return step.payload
    }} as unknown as Response
  }

  proxy(): StoreTryOnProxy {
    return new StoreTryOnProxy('https://transport-test.invalid', 'synthetic-test-token', async seconds => {
      this.delays.push(seconds)
    }, this)
  }

  consumed(): void { expect(this.index).toBe(this.steps.length) }
}

@component
export class StoreTryOnTransportRecovery extends Scenario {
  async run(): Promise<void> {
    const harness = await StoreTryOnHarness.open(false)
    const main = harness.main
    if (!main.sampleShopper || !main.sampleShirt || !main.sampleShirtPreview) throw new Error('Synthetic JPEG fixtures are missing.')
    const shopper = await encodeImage(makeThumbnail(main.sampleShopper))
    const garment = await encodeImage(makeThumbnail(main.sampleShirt))
    const jpeg = await encodeImage(makeThumbnail(main.sampleShirtPreview))
    expect(jpeg.startsWith('/9j/')).toBe(true)
    const created = (id: string): Step => ({method: 'POST', status: 202, payload: {id, status: 'processing'}})
    const success: Step = {method: 'GET', payload: {status: 'success', previewImageBase64: jpeg}}
    const broken: Step = {method: 'GET', failure: 'json'}

    // Exercise Hermes validation with a real full-size JPEG, not only tiny thumbnails.
    const fullJpeg = await encodeImage(main.sampleShirtPreview)
    expect(fullJpeg.length > 50000).toBe(true)
    const large = new RecoveryTransport([created('full-size'),
      {method: 'GET', payload: {status: 'success', previewImageBase64: fullJpeg}}])
    const largeProxy = large.proxy()
    expect((await largeProxy.generate(shopper, garment, 'shirt', () => {})) === fullJpeg).toBe(true)
    expect(largeProxy.hasPendingJob()).toBe(true)
    largeProxy.discardPending()
    expect(largeProxy.hasPendingJob()).toBe(false)
    expect(large.posts).toBe(1); expect(large.gets).toBe(1); large.consumed()

    // A truncated HTTP 200 body and a disconnect are retried on the same GET.
    const recovered = new RecoveryTransport([created('partial'), broken, {method: 'GET', failure: 'network'}, success])
    expect(await recovered.proxy().generate(shopper, garment, 'shirt', () => {})).toBe(jpeg)
    expect(recovered.posts).toBe(1); expect(recovered.gets).toBe(3)
    expect(recovered.getIds.join(',')).toBe('partial,partial,partial')
    expect(recovered.delays.join(',')).toBe('2,1,2'); recovered.consumed()

    // Exhaustion surfaces a safe error. Explicit retry resumes without POSTing.
    const resumed = new RecoveryTransport([created('resume'), broken, broken, broken, success, created('after-success'), success])
    const resumable = resumed.proxy()
    await this.failure(resumable, shopper, garment, 'shirt', 'invalid_response')
    expect(resumed.posts).toBe(1); expect(resumed.gets).toBe(3)
    expect(resumable.hasPendingJob()).toBe(true)
    expect(await resumable.generate(shopper, garment, 'shirt', () => {})).toBe(jpeg)
    expect(resumed.posts).toBe(1)
    expect(resumed.getIds.join(',')).toBe('resume,resume,resume,resume')
    // Retain successful bytes until the consumer accepts/decodes the preview.
    expect(resumable.hasPendingJob()).toBe(true)
    const delaysBeforeCache = resumed.delays.length
    expect(await resumable.generate(shopper, garment, 'shirt', () => {})).toBe(jpeg)
    expect(resumed.posts).toBe(1); expect(resumed.gets).toBe(4)
    expect(resumed.delays.length).toBe(delaysBeforeCache)
    resumable.discardPending()
    expect(resumable.hasPendingJob()).toBe(false)
    // Main's explicit acceptance/discard permits the next fresh creation.
    expect(await resumable.generate(shopper, garment, 'shirt', () => {})).toBe(jpeg)
    expect(resumed.posts).toBe(2); resumed.consumed()

    // Discard, either exact input string changing, or category changing creates a fresh job.
    for (const change of ['discard', 'shopper', 'garment', 'category']) {
      const replaced = new RecoveryTransport([created('old'), broken, broken, broken, created('new'), success])
      const proxy = replaced.proxy()
      await this.failure(proxy, shopper, garment, 'shirt', 'invalid_response')
      if (change === 'discard') proxy.discardPending()
      expect(await proxy.generate(change === 'shopper' ? garment : shopper,
        change === 'garment' ? shopper : garment, change === 'category' ? 'jacket' : 'shirt', () => {})).toBe(jpeg)
      expect(replaced.posts).toBe(2)
      expect(replaced.getIds.join(',')).toBe('old,old,old,new'); replaced.consumed()
    }

    // Both provider terminal errors and missing jobs discard the resumable ID.
    for (const terminal of [
      {method: 'GET', payload: {status: 'error', error: 'provider_rate_limited'}} as Step,
      {method: 'GET', status: 404, payload: {error: 'job_not_found'}} as Step,
      {method: 'GET', status: 401, payload: {error: 'unauthorized'}} as Step,
    ]) {
      const ended = new RecoveryTransport([created('ended'), terminal, created('fresh'), success])
      const proxy = ended.proxy()
      await this.failure(proxy, shopper, garment, 'shirt',
        terminal.status === 404 ? 'job_not_found' : terminal.status === 401 ? 'unauthorized' : 'provider_rate_limited')
      expect(proxy.hasPendingJob()).toBe(false)
      expect(await proxy.generate(shopper, garment, 'shirt', () => {})).toBe(jpeg)
      expect(ended.posts).toBe(2); expect(ended.gets).toBe(2); ended.consumed()
    }

    // An ambiguous POST outcome is never automatically retried, even a partial JSON body.
    for (const failure of ['network', 'json'] as const) {
      const rejected = new RecoveryTransport([{method: 'POST', status: 202, failure}])
      await this.failure(rejected.proxy(), shopper, garment, 'shirt', failure === 'network' ? 'network_error' : 'invalid_response')
      expect(rejected.posts).toBe(1); expect(rejected.gets).toBe(0)
      expect(rejected.delays.length).toBe(0); rejected.consumed()
    }

    // A discarded creation may settle later; it must never restore its photo/job references.
    let releasePost!: (response: Response) => void
    let inFlightPosts = 0, inFlightGets = 0
    const deferred: Pick<InternetModule, 'fetch'> = {fetch: async (_request, options) => {
      if (options?.method === 'POST') {
        inFlightPosts++
        return new Promise<Response>(resolve => { releasePost = resolve })
      }
      inFlightGets++
      throw new Error('Cancelled creation must not poll.')
    }}
    const cancelled = new StoreTryOnProxy('https://transport-test.invalid', 'synthetic-test-token', async () => {}, deferred)
    const outstanding = this.promiseFailure(cancelled.generate(shopper, garment, 'shirt', () => {}), 'job_cancelled')
    expect(inFlightPosts).toBe(1)
    cancelled.discardPending()
    releasePost({status: 202, json: async () => ({id: 'discarded', status: 'processing'})} as unknown as Response)
    await outstanding
    expect(cancelled.hasPendingJob()).toBe(false)
    expect(inFlightPosts).toBe(1); expect(inFlightGets).toBe(0)
    print('[StoreTryOn TRANSPORT] PASS injected transport: bounded GET retries, same-job/cache resume, discard invalidation including in-flight POST, terminal cleanup, no POST retry; providerRequests=0')
  }

  private async failure(proxy: StoreTryOnProxy, shopper: string, garment: string, category: GarmentCategory, code: string): Promise<void> {
    await this.promiseFailure(proxy.generate(shopper, garment, category, () => {}), code)
  }

  private async promiseFailure(result: Promise<string>, code: string): Promise<void> {
    let caught: unknown
    try { await result } catch (error) { caught = error }
    if (!(caught instanceof StoreTryOnServiceError)) throw new Error('Expected a sanitized transport error.')
    expect(caught.code).toBe(code)
    expect(caught.message.includes('private-transport-detail')).toBe(false)
  }
}

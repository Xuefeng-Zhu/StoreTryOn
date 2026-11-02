import http from 'node:http';
import https from 'node:https';
import { lookup } from 'node:dns';
import { isIP } from 'node:net';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const API_ORIGIN = 'https://yce-api-01.makeupar.com';
const DEFAULT_MEDIA_HOST = 'yce-us.s3-accelerate.amazonaws.com';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // Deliberately below YouCam's <10 MB limit.
const MAX_BODY_BYTES = 4 * Math.ceil(MAX_IMAGE_BYTES / 3) * 2 + 2048;
const MAX_PROVIDER_JSON_BYTES = 256 * 1024;
const MAX_RESULT_BYTES = 8 * 1024 * 1024;
const hash = (text) => createHash('sha256').update(text).digest();

export class ProxyError extends Error {
  constructor(code, status = 502) { super(code); this.code = code; this.status = status; }
}

function boundedInteger(value, fallback, min, max, name) {
  if (value === undefined || value === '') return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) throw new Error(`${name} must be ${min}..${max}`);
  return number;
}

export function loadConfig(env = process.env) {
  const apiKey = env.YOUCAM_API_KEY;
  const proxyToken = env.STORETRYON_PROXY_TOKEN;
  if (!apiKey || /[\r\n]/.test(apiKey)) throw new Error('Set YOUCAM_API_KEY on the server.');
  if (!proxyToken || proxyToken.length < 32 || /\s/.test(proxyToken)) throw new Error('Set STORETRYON_PROXY_TOKEN to a random token of at least 32 characters.');
  if (proxyToken === apiKey) throw new Error('STORETRYON_PROXY_TOKEN must differ from YOUCAM_API_KEY.');
  const mediaHosts = new Set((env.YOUCAM_MEDIA_HOSTS || DEFAULT_MEDIA_HOST).split(',').map(x => x.trim().toLowerCase()).filter(Boolean));
  for (const host of mediaHosts) {
    if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(host) || !host.includes('.') || isIP(host) || host.endsWith('.local')) {
      throw new Error('YOUCAM_MEDIA_HOSTS must contain exact public DNS hostnames, without wildcards or URL paths.');
    }
  }
  return {
    apiKey, proxyToken, mediaHosts,
    port: boundedInteger(env.PORT, 8787, 1, 65535, 'PORT'),
    host: env.HOST || '127.0.0.1',
    pollMs: 10000,
    jobTimeoutMs: 240000,
    resultTtlMs: 15 * 60 * 1000,
    maxConcurrentJobs: 2,
    maxStoredJobs: 12,
    requestsPerMinute: 6,
  };
}

export function isPublicAddress(address) {
  if (isIP(address) === 4) {
    const [a,b,c] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
  }
  // Permit global-unicast IPv6 only; reject mapped, loopback, link-local and ULA addresses.
  return isIP(address) === 6 && /^[23]/i.test(address) && !address.toLowerCase().startsWith('2001:db8:');
}

function safeLookup(host, options, callback) {
  lookup(host, { all: true, verbatim: true }, (error, addresses) => {
    if (error) return callback(error);
    if (!addresses.length || addresses.some(x => !isPublicAddress(x.address))) return callback(new ProxyError('unsafe_upstream_address'));
    // Pin the actual socket lookup to this checked answer; no second DNS lookup/rebinding window.
    if (options?.all) callback(null, addresses);
    else callback(null, addresses[0].address, addresses[0].family);
  });
}

export function checkedMediaUrl(raw, allowedHosts) {
  let url;
  try { url = new URL(raw); } catch { throw new ProxyError('invalid_media_url'); }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') ||
      !allowedHosts.has(url.hostname.toLowerCase()) || isIP(url.hostname)) throw new ProxyError('media_host_not_allowed');
  return url;
}

// No redirects. Each response is bounded; provider/API credentials never follow a redirect to storage.
export function requestBytes({ url, method = 'GET', headers = {}, body, maxBytes, signal }) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, { method, headers, signal, lookup: safeLookup, timeout: 30000 }, response => {
      const chunks = [];
      let length = 0;
      response.on('data', chunk => {
        length += chunk.length;
        if (length > maxBytes) {
          response.destroy(new ProxyError('upstream_response_too_large'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) }));
      response.on('error', reject);
    });
    request.on('timeout', () => request.destroy(new ProxyError('upstream_timeout')));
    request.on('error', reject);
    request.end(body);
  });
}

function parseJson(response) {
  let data;
  try { data = JSON.parse(response.body.toString('utf8')); }
  catch { if (response.status >= 200 && response.status < 300) throw new ProxyError('invalid_provider_response'); }
  if (response.status < 200 || response.status >= 300 || (data?.status !== undefined && data.status !== 200)) {
    const code = response.status === 401 || response.status === 403 ? 'provider_authorization_failed' :
      response.status === 402 || data?.error_code === 'CreditInsufficiency' ? 'provider_credits_required' :
      response.status === 429 ? 'provider_rate_limited' : 'provider_request_failed';
    throw new ProxyError(code);
  }
  if (!data || typeof data !== 'object') throw new ProxyError('invalid_provider_response');
  return data;
}

function jpegDimensions(bytes) {
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset++] !== 0xff) throw new ProxyError('invalid_image', 400);
    while (offset < bytes.length && bytes[offset] === 0xff) offset++;
    if (offset + 3 > bytes.length) break;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const segment = bytes.readUInt16BE(offset);
    if (segment < 2 || offset + segment > bytes.length) break;
    if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
      if (segment < 8) break;
      return { width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3) };
    }
    offset += segment;
  }
  throw new ProxyError('invalid_image', 400);
}

export function inspectImage(bytes, enforceInputDimensions = true) {
  let mimeType, width, height;
  if (bytes.length >= 24 && bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && bytes.toString('ascii',12,16) === 'IHDR') {
    mimeType = 'image/png';
    width = bytes.readUInt32BE(16); height = bytes.readUInt32BE(20);
  } else if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    mimeType = 'image/jpg';
    ({ width, height } = jpegDimensions(bytes));
  } else throw new ProxyError('invalid_image', 400);
  if (!width || !height || width > 4096 || height > 4096) throw new ProxyError('image_dimensions', 400);
  if (enforceInputDimensions && (Math.max(width,height) < 512 || Math.min(width,height) < 384)) throw new ProxyError('image_too_small', 400);
  return { mimeType, width, height };
}

export function decodeInputImage(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 4 * Math.ceil(MAX_IMAGE_BYTES / 3) ||
      value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw new ProxyError('invalid_image_base64', 400);
  const bytes = Buffer.from(value, 'base64');
  if (bytes.length > MAX_IMAGE_BYTES || bytes.toString('base64') !== value) throw new ProxyError('invalid_image_base64', 400);
  return { bytes, ...inspectImage(bytes) };
}

function sanitizeUploadHeaders(input, bytes) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ProxyError('invalid_upload_request');
  const headers = {};
  for (const [name,value] of Object.entries(input)) {
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name) || typeof value !== 'string' || /[\r\n]/.test(value) || value.length > 16384 ||
      /^(host|connection|transfer-encoding|authorization|cookie|proxy-authorization)$/i.test(name)) throw new ProxyError('invalid_upload_headers');
    if (name.toLowerCase() !== 'content-length') headers[name] = value;
  }
  headers['Content-Length'] = String(bytes.length);
  return headers;
}

function wait(ms, signal) {
  return new Promise((resolve,reject) => {
    if (signal?.aborted) return reject(new ProxyError('job_cancelled'));
    const onAbort = () => { clearTimeout(timer); reject(new ProxyError('job_cancelled')); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort',onAbort); resolve(); },ms);
    signal?.addEventListener('abort',onAbort,{once:true});
  });
}

export class YouCamClient {
  constructor(config, transport = requestBytes, sleep = wait) { this.config = config; this.transport = transport; this.sleep = sleep; }
  async api(path, method, payload, signal) {
    const body = payload === undefined ? undefined : Buffer.from(JSON.stringify(payload));
    return parseJson(await this.transport({ url: new URL(path, API_ORIGIN), method, signal, body, maxBytes: MAX_PROVIDER_JSON_BYTES,
      headers: { Authorization: `Bearer ${this.config.apiKey}`, Accept:'application/json', ...(body ? {'Content-Type':'application/json','Content-Length':String(body.length)} : {}) } }));
  }
  async generate({ shopper, garment, category }, signal) {
    const images = [shopper,garment];
    const upload = await this.api('/s2s/v2.0/file','POST',{files:images.map((image,index) => ({
      content_type:image.mimeType,file_name:`${index === 0 ? 'shopper' : 'garment'}.${image.mimeType === 'image/png' ? 'png' : 'jpg'}`,file_size:image.bytes.length,
    }))},signal);
    const files = upload.data?.files ?? upload.files;
    if (!Array.isArray(files) || files.length !== 2) throw new ProxyError('invalid_upload_response');
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (typeof file.file_id !== 'string' || !file.file_id || !Array.isArray(file.requests) || file.requests.length !== 1) throw new ProxyError('invalid_upload_response');
      const request = file.requests[0];
      if (request.method !== 'PUT') throw new ProxyError('invalid_upload_request');
      const url = checkedMediaUrl(request.url,this.config.mediaHosts);
      const response = await this.transport({url,method:'PUT',headers:sanitizeUploadHeaders(request.headers,images[i].bytes),body:images[i].bytes,maxBytes:65536,signal});
      if (response.status < 200 || response.status >= 300) throw new ProxyError('image_upload_failed');
    }
    const task = await this.api('/s2s/v2.0/task/cloth-v4','POST',{
      src_file_id:files[0].file_id,ref_file_id:files[1].file_id,
      garment_category:category === 'shirt' ? 'upper_body' : 'outer',filter_multi_person:'normal',
    },signal);
    const id = task.data?.task_id;
    if (typeof id !== 'string' || !id || id.length > 256) throw new ProxyError('invalid_task_response');
    for (let attempt = 0; attempt < Math.ceil(this.config.jobTimeoutMs / this.config.pollMs); attempt++) {
      await this.sleep(this.config.pollMs,signal);
      const poll = await this.api(`/s2s/v2.0/task/cloth-v4/${encodeURIComponent(id)}`,'GET',undefined,signal);
      const data = poll.data;
      if (data?.task_status === 'error' || data?.error) throw new ProxyError('generation_failed');
      if (data?.task_status !== 'success') continue;
      const url = checkedMediaUrl(data.results?.url,this.config.mediaHosts);
      const result = await this.transport({url,method:'GET',headers:{Accept:'image/jpeg,image/png'},maxBytes:MAX_RESULT_BYTES,signal});
      if (result.status !== 200) throw new ProxyError('result_download_failed');
      const image = inspectImage(result.body,false);
      return {previewImageBase64:result.body.toString('base64'),previewMimeType:image.mimeType === 'image/jpg' ? 'image/jpeg' : image.mimeType};
    }
    throw new ProxyError('generation_timed_out');
  }
}

function send(response,status,data) {
  response.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  response.end(JSON.stringify(data));
}

async function readBody(request) {
  const declared = request.headers['content-length'];
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_BODY_BYTES)) throw new ProxyError('request_too_large',413);
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > MAX_BODY_BYTES) throw new ProxyError('request_too_large',413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new ProxyError('invalid_json',400); }
}

export function createApp(config, { client = new YouCamClient(config), now = Date.now } = {}) {
  const jobs = new Map();
  const tokenDigest = hash(config.proxyToken);
  let recentCreates = [];
  const cleanup = () => {
    for (const [id,job] of jobs) if (job.expiresAt <= now()) { job.controller.abort(); jobs.delete(id); }
  };
  const interval = setInterval(cleanup,60000);
  interval.unref();
  const handler = async (request,response) => {
    try {
      cleanup();
      if (request.method === 'GET' && request.url === '/healthz') return send(response,200,{status:'ok'});
      const authorization = request.headers.authorization;
      if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ') || !timingSafeEqual(hash(authorization.slice(7)),tokenDigest)) {
        return send(response,401,{error:'unauthorized'});
      }
      if (request.method === 'POST' && request.url === '/v1/tryons') {
        if (!/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] || '')) return send(response,415,{error:'json_required'});
        recentCreates = recentCreates.filter(time => time > now() - 60000);
        if (recentCreates.length >= config.requestsPerMinute) return send(response,429,{error:'rate_limited'});
        if ([...jobs.values()].filter(job => job.status === 'processing').length >= config.maxConcurrentJobs || jobs.size >= config.maxStoredJobs) return send(response,429,{error:'capacity_reached'});
        const body = await readBody(request);
        if (!body || Array.isArray(body) || typeof body !== 'object' || Object.keys(body).some(key => !['shopperImageBase64','garmentImageBase64','category'].includes(key))) throw new ProxyError('invalid_request',400);
        if (body.category !== 'shirt' && body.category !== 'jacket') throw new ProxyError('invalid_category',400);
        const shopper = decodeInputImage(body.shopperImageBase64);
        const garment = decodeInputImage(body.garmentImageBase64);
        // Re-check after asynchronous request reads so simultaneous posts cannot exceed the bounds.
        recentCreates = recentCreates.filter(time => time > now() - 60000);
        if (recentCreates.length >= config.requestsPerMinute) return send(response,429,{error:'rate_limited'});
        if ([...jobs.values()].filter(job => job.status === 'processing').length >= config.maxConcurrentJobs || jobs.size >= config.maxStoredJobs) return send(response,429,{error:'capacity_reached'});
        const id = randomBytes(16).toString('hex');
        const job = {id,status:'processing',expiresAt:now() + config.jobTimeoutMs + config.resultTtlMs,controller:new AbortController()};
        jobs.set(id,job);
        recentCreates.push(now());
        send(response,202,{id,status:job.status});
        const deadline = setTimeout(() => job.controller.abort(),config.jobTimeoutMs);
        deadline.unref();
        Promise.resolve().then(() => client.generate({shopper,garment,category:body.category},job.controller.signal)).then(result => {
          if (!jobs.has(id)) return;
          if (job.controller.signal.aborted) throw new ProxyError('generation_timed_out');
          job.status = 'success'; job.result = result; job.expiresAt = now() + config.resultTtlMs;
        }).catch(error => {
          if (!jobs.has(id)) return;
          job.status = 'error';
          job.error = job.controller.signal.aborted ? 'generation_timed_out' : error instanceof ProxyError ? error.code : 'provider_unavailable';
          job.expiresAt = now() + config.resultTtlMs;
        }).finally(() => clearTimeout(deadline));
        return;
      }
      const match = /^\/v1\/tryons\/([a-f0-9]{32})$/.exec(request.url || '');
      if (match && (request.method === 'GET' || request.method === 'DELETE')) {
        const job = jobs.get(match[1]);
        if (!job) return send(response,404,{error:'job_not_found'});
        if (request.method === 'DELETE') { job.controller.abort(); jobs.delete(job.id); return send(response,200,{status:'deleted'}); }
        return send(response,200,{id:job.id,status:job.status,...job.result,...(job.error ? {error:job.error} : {})});
      }
      return send(response,404,{error:'not_found'});
    } catch (error) {
      const safeError = error instanceof ProxyError ? error : new ProxyError('request_failed',500);
      if (!response.headersSent) send(response,safeError.status,{error:safeError.code});
      else response.destroy();
    }
  };
  return {handler,close() {clearInterval(interval); for (const job of jobs.values()) job.controller.abort(); jobs.clear();}};
}

export function startServer(config = loadConfig()) {
  const app = createApp(config);
  const server = http.createServer(app.handler);
  server.requestTimeout = 30000;
  server.headersTimeout = 10000;
  server.maxHeadersCount = 32;
  server.on('close',() => app.close());
  server.listen(config.port,config.host,() => console.log(`StoreTryOn proxy listening on ${config.host}:${config.port}; TLS must terminate at your private reverse proxy.`));
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { startServer(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}

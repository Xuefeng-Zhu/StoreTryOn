/** Opt-in live provider check through the real local HTTP proxy. Excluded from npm test. */
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { randomBytes } from 'node:crypto';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { createApp, inspectImage, loadConfig } from '../server.mjs';

const args = process.argv.slice(2);
const envIndex = args.indexOf('--env-file');
const categoryIndex = args.indexOf('--category');
const selected = categoryIndex < 0 ? 'both' : args[categoryIndex + 1];
if (envIndex < 0 || !args[envIndex + 1] || !['shirt', 'jacket', 'both'].includes(selected)) {
  console.error('Usage: node test/live-http-proof.mjs --env-file <private .env path> [--category shirt|jacket|both]');
  process.exit(2);
}
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const privateEnv = parseEnv(await readFile(args[envIndex + 1], 'utf8'));
const config = loadConfig({
  YOUCAM_API_KEY: privateEnv.YOUCAM_API_KEY,
  STORETRYON_PROXY_TOKEN: randomBytes(32).toString('hex'),
});
delete privateEnv.YOUCAM_API_KEY;
const stamp = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Los_Angeles', dateStyle: 'short', timeStyle: 'medium', hour12: false,
}).format(new Date()).replace(/[^0-9]/g, '');
const evidenceRoot = resolve(projectRoot, 'Assets/LiveEvidence');
await mkdir(evidenceRoot, {recursive: true});
const outputDir = resolve(evidenceRoot, 'http-' + stamp + '-' + randomBytes(3).toString('hex'));
await mkdir(outputDir);
const relativePath = path => relative(projectRoot, path).split('\\').join('/');
const shopper = (await readFile(resolve(projectRoot, 'Assets/Samples/shopper-synthetic.png'))).toString('base64');

// The default client uses real HTTPS provider requests. No transport/client replacement.
const app = createApp(config);
const server = http.createServer(app.handler);
server.requestTimeout = 30000;
server.headersTimeout = 10000;
server.maxHeadersCount = 32;
await new Promise((resolveReady, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolveReady);
});
const origin = 'http://127.0.0.1:' + server.address().port;
const records = [];

async function api(path, {method = 'GET', body, authenticated = true} = {}) {
  const response = await fetch(origin + path, {
    method,
    headers: {
      ...(authenticated ? {Authorization: 'Bearer ' + config.proxyToken} : {}),
      ...(body ? {'Content-Type': 'application/json'} : {}),
    },
    ...(body ? {body: JSON.stringify(body)} : {}),
    signal: AbortSignal.timeout(30000),
  });
  return {status: response.status, cacheControl: response.headers.get('cache-control'), body: await response.json()};
}

try {
  const unauthorized = await api('/v1/tryons', {method: 'POST', body: {}, authenticated: false});
  assert.equal(unauthorized.status, 401);
  console.log(JSON.stringify({phase: 'proxy-authentication', status: 'passed', httpStatus: 401}));

  for (const category of selected === 'both' ? ['shirt', 'jacket'] : [selected]) {
    const started = Date.now();
    const record = {
      category, garmentCategory: category === 'shirt' ? 'upper_body' : 'outer',
      provider: 'YouCam Clothes V4', startedAt: new Date().toISOString(), status: 'processing',
      inputOrigin: 'Synthetic shopper and garment fixtures from Assets/Samples',
      proofScope: 'Fresh real local authenticated HTTP proxy → YouCam → downloaded image; not deployed HTTPS, Lens, or device proof',
      httpSteps: [{phase: 'unauthorized-request', httpStatus: 401}],
    };
    records.push(record);
    const evidenceFile = resolve(outputDir, category + '-http-live-proof.json');
    let jobPath;
    try {
      const garment = (await readFile(resolve(projectRoot, 'Assets/Samples/' + category + '-synthetic.png'))).toString('base64');
      const created = await api('/v1/tryons', {method: 'POST', body: {
        shopperImageBase64: shopper, garmentImageBase64: garment, category,
      }});
      record.httpSteps.push({phase: 'create-job', httpStatus: created.status});
      if (created.status !== 202) throw new Error(created.body.error || 'create_failed');
      assert.equal(created.body.status, 'processing');
      assert.match(created.body.id, /^[a-f0-9]{32}$/);
      jobPath = '/v1/tryons/' + created.body.id;
      console.log(JSON.stringify({category, phase: 'live-generation-started', httpStatus: 202}));
      let complete;
      while (Date.now() - started < config.jobTimeoutMs + 15000) {
        await delay(2000);
        const result = await api(jobPath);
        record.httpSteps.push({phase: 'poll-job', httpStatus: result.status, taskStatus: result.body.status});
        assert.equal(result.status, 200);
        assert.equal(result.cacheControl, 'no-store');
        if (result.body.status === 'error') throw new Error(result.body.error || 'generation_failed');
        if (result.body.status === 'success') { complete = result.body; break; }
        assert.equal(result.body.status, 'processing');
      }
      if (!complete) throw new Error('generation_timed_out');
      record.providerTaskStatus = 'success';
      assert.equal(typeof complete.previewImageBase64, 'string');
      const bytes = Buffer.from(complete.previewImageBase64, 'base64');
      const image = inspectImage(bytes, false);
      const normalizedMime = type => type === 'image/jpg' ? 'image/jpeg' : type;
      const output = resolve(outputDir, category + '-youcam-http-live.' + (image.mimeType === 'image/png' ? 'png' : 'jpg'));
      await writeFile(output, bytes, {flag: 'wx'});
      Object.assign(record, {width: image.width, height: image.height,
        outputMimeType: normalizedMime(image.mimeType), outputBytes: bytes.length, outputFile: relativePath(output)});
      assert.equal(normalizedMime(image.mimeType), normalizedMime(complete.previewMimeType));
      const removed = await api(jobPath, {method: 'DELETE'});
      assert.equal(removed.status, 200);
      const deleted = await api(jobPath);
      assert.equal(deleted.status, 404);
      record.httpSteps.push({phase: 'delete-job', httpStatus: 200}, {phase: 'verify-deletion', httpStatus: 404});
      Object.assign(record, {status: 'success', finishedAt: new Date().toISOString(),
        elapsedSeconds: Number(((Date.now() - started) / 1000).toFixed(2)),
        width: image.width, height: image.height, outputMimeType: normalizedMime(image.mimeType),
        outputBytes: bytes.length, outputFile: relativePath(output)});
      await writeFile(evidenceFile, JSON.stringify(record, null, 2) + '\n');
      console.log(JSON.stringify({category, status: 'success', elapsedSeconds: record.elapsedSeconds,
        width: image.width, height: image.height, outputFile: record.outputFile}));
    } catch (error) {
      if (jobPath) { try { await api(jobPath, {method: 'DELETE'}); } catch {} }
      const errorCode = /^[a-z][a-z0-9_]{1,63}$/.test(error.message || '') ? error.message : 'live_http_check_failed';
      Object.assign(record, {status: 'error', error: errorCode, finishedAt: new Date().toISOString()});
      await writeFile(evidenceFile, JSON.stringify(record, null, 2) + '\n');
      console.log(JSON.stringify({category, status: 'error', error: errorCode, evidence: relativePath(evidenceFile)}));
      process.exitCode = 1;
      break; // No retry or second generation after a failed first category.
    }
  }
  await writeFile(resolve(outputDir, 'summary.json'), JSON.stringify({
    recordedAt: new Date().toISOString(), timezone: 'America/Los_Angeles',
    freshRequests: true, mocked: false, priorEvidencePreserved: true,
    categories: records, secretsSaved: false,
  }, null, 2) + '\n');
  console.log(JSON.stringify({evidenceDirectory: relativePath(outputDir), status: process.exitCode ? 'failed' : 'success'}));
} finally {
  app.close();
  server.closeIdleConnections();
  await new Promise(resolveClosed => server.close(resolveClosed));
}

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { deflateSync } from 'node:zlib';
import { checkedMediaUrl, createApp, decodeInputImage, isPublicAddress, loadConfig, ProxyError, YouCamClient } from '../server.mjs';

const token = 'test-proxy-token-with-at-least-thirty-two-characters';
const config = () => loadConfig({YOUCAM_API_KEY:'test-provider-key',STORETRYON_PROXY_TOKEN:token});
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(name, bytes) {
  const type = Buffer.from(name), size = Buffer.alloc(4), checksum = Buffer.alloc(4);
  size.writeUInt32BE(bytes.length); checksum.writeUInt32BE(crc32(Buffer.concat([type,bytes])));
  return Buffer.concat([size,type,bytes,checksum]);
}
function png(width = 512, height = 384) {
  const header = Buffer.alloc(13); header.writeUInt32BE(width,0); header.writeUInt32BE(height,4); header[8] = 8; header[9] = 2;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.alloc((width * 3 + 1) * height))),chunk('IEND',Buffer.alloc(0))]);
}
const imageBytes = png();
const image = decodeInputImage(imageBytes.toString('base64'));
const input = category => ({shopperImageBase64:imageBytes.toString('base64'),garmentImageBase64:imageBytes.toString('base64'),category});
const jsonResponse = (body,status = 200) => ({status,headers:{'content-type':'application/json'},body:Buffer.from(JSON.stringify(body))});

function providerTransport({category = 'upper_body', topLevelFiles = false, unsafe = false, taskError = false, unauthorized = false, redirect = false} = {}) {
  const calls = [];
  let polls = 0;
  const transport = async request => {
    calls.push(request);
    const url = new URL(request.url);
    if (url.pathname === '/s2s/v2.0/file') {
      if (unauthorized) return jsonResponse({message:'secret must not propagate'},401);
      assert.equal(request.headers.Authorization,'Bearer test-provider-key');
      const payload = JSON.parse(request.body);
      assert.deepEqual(payload.files.map(f=>[f.content_type,f.file_size]),[['image/png',imageBytes.length],['image/png',imageBytes.length]]);
      const files = ['shopper-id','garment-id'].map((id,i)=>({file_id:id,requests:[{method:'PUT',url:`https://${unsafe ? '127.0.0.1' : 'yce-us.s3-accelerate.amazonaws.com'}/upload-${i}?signature=test`,headers:{'Content-Type':'image/png','Content-Length':String(imageBytes.length)}}]}));
      return jsonResponse(topLevelFiles ? {status:200,files} : {status:200,data:{files}});
    }
    if (request.method === 'PUT') {
      assert.equal(request.headers.Authorization,undefined);
      assert.equal(request.headers['Content-Length'],String(imageBytes.length));
      assert.deepEqual(request.body,imageBytes);
      return {status:200,headers:{},body:Buffer.alloc(0)};
    }
    if (url.pathname === '/s2s/v2.0/task/cloth-v4') {
      assert.deepEqual(JSON.parse(request.body),{src_file_id:'shopper-id',ref_file_id:'garment-id',garment_category:category,filter_multi_person:'normal'});
      return jsonResponse({status:200,data:{task_id:'task id'}});
    }
    if (url.pathname === '/s2s/v2.0/task/cloth-v4/task%20id') {
      polls++;
      if (taskError) return jsonResponse({status:200,data:{task_status:'error',error:'unsafe provider error text'}});
      return jsonResponse({status:200,data:{task_status:polls === 1 ? 'running' : 'success',error:null,results:{url:'https://yce-us.s3-accelerate.amazonaws.com/result.png?signature=test'}}});
    }
    if (url.pathname === '/result.png') {
      assert.equal(request.headers.Authorization,undefined);
      return {status:redirect ? 302 : 200,headers:{location:'http://localhost/private'},body:imageBytes};
    }
    throw new Error(`Unexpected mocked request ${request.method} ${url.pathname}`);
  };
  return {transport,calls};
}

test('requires server-only provider key and independent strong proxy token',()=>{
  assert.throws(()=>loadConfig({}),/YOUCAM_API_KEY/);
  assert.throws(()=>loadConfig({YOUCAM_API_KEY:'key',STORETRYON_PROXY_TOKEN:'short'}),/STORETRYON_PROXY_TOKEN/);
  assert.throws(()=>loadConfig({YOUCAM_API_KEY:token,STORETRYON_PROXY_TOKEN:token}),/must differ/);
  assert.throws(()=>loadConfig({YOUCAM_API_KEY:'key',STORETRYON_PROXY_TOKEN:token,YOUCAM_MEDIA_HOSTS:'*.amazonaws.com'}),/exact public DNS/);
});

test('validates canonical base64, PNG/JPEG signature and input image dimensions',()=>{
  assert.equal(image.width,512); assert.equal(image.height,384); assert.equal(image.mimeType,'image/png');
  for (const value of ['', 'abc', 'Zg==\n', 'data:image/png;base64,AA==', Buffer.from('not an image').toString('base64')]) assert.throws(()=>decodeInputImage(value),ProxyError);
  assert.throws(()=>decodeInputImage(png(64,64).toString('base64')),error=>error.code === 'image_too_small');
  assert.throws(()=>decodeInputImage(Buffer.from([0xff,0xd8,0xff,0xff,0xff,0xff]).toString('base64')),error=>error.code === 'invalid_image');
  const bigHeader = Buffer.from(imageBytes); bigHeader.writeUInt32BE(4097,16);
  assert.throws(()=>decodeInputImage(bigHeader.toString('base64')),error=>error.code === 'image_dimensions');
});

test('blocks local/private upstreams, userinfo, redirects and non-HTTPS media URLs',()=>{
  const allowed = config().mediaHosts;
  assert.equal(checkedMediaUrl('https://yce-us.s3-accelerate.amazonaws.com/path?sig=x',allowed).protocol,'https:');
  for (const url of ['http://yce-us.s3-accelerate.amazonaws.com/a','https://127.0.0.1/a','https://user:pass@yce-us.s3-accelerate.amazonaws.com/a','https://yce-us.s3-accelerate.amazonaws.com:8443/a','https://evil.example/a']) assert.throws(()=>checkedMediaUrl(url,allowed),ProxyError);
  for (const ip of ['127.0.0.1','10.1.2.3','192.168.1.3','169.254.169.254','172.16.0.1','100.64.1.1','::1','::ffff:127.0.0.1','fd00::1','fe80::1','2001:db8::1']) assert.equal(isPublicAddress(ip),false,ip);
  assert.equal(isPublicAddress('8.8.8.8'),true); assert.equal(isPublicAddress('2606:4700:4700::1111'),true);
});

for (const [category,expected] of [['shirt','upper_body'],['jacket','outer']]) {
  test(`real provider protocol with mocked transport maps ${category} to ${expected}`,async()=>{
    const {transport,calls} = providerTransport({category:expected,topLevelFiles:category === 'jacket'});
    let sleeps = 0;
    const client = new YouCamClient(config(),transport,async(ms)=>{assert.equal(ms,10000); sleeps++;});
    const result = await client.generate({shopper:image,garment:image,category},new AbortController().signal);
    assert.equal(result.previewImageBase64,imageBytes.toString('base64'));
    assert.equal(result.previewMimeType,'image/png'); assert.equal(sleeps,2); assert.equal(calls.length,7);
    assert.equal(JSON.stringify(result).includes('signature'),false);
  });
}

test('provider failure, unsafe signed URL and redirect stop without disclosing provider body',async()=>{
  for (const [options,errorCode] of [[{unauthorized:true},'provider_authorization_failed'],[{unsafe:true},'media_host_not_allowed'],[{taskError:true},'generation_failed'],[{redirect:true},'result_download_failed']]) {
    const {transport} = providerTransport(options);
    const client = new YouCamClient(config(),transport,async()=>{});
    await assert.rejects(client.generate({shopper:image,garment:image,category:'shirt'},new AbortController().signal),error=>error.code === errorCode && !error.message.includes('secret'));
  }
});


test('official HTTP400 CreditInsufficiency becomes a sanitized credits error',async()=>{
  const client = new YouCamClient(config(),async()=>jsonResponse({status:400,error:'Insufficient unit to run',error_code:'CreditInsufficiency'},400));
  await assert.rejects(client.generate({shopper:image,garment:image,category:'shirt'},new AbortController().signal),error=>error.code === 'provider_credits_required');
});

test('provider polling has a finite deadline/attempt bound',async()=>{
  const cfg = config(); cfg.jobTimeoutMs = 20000;
  const client = new YouCamClient(cfg,async request => {
    const url = new URL(request.url);
    if (url.pathname.endsWith('/file')) return jsonResponse({data:{files:['a','b'].map(file_id=>({file_id,requests:[{method:'PUT',url:'https://yce-us.s3-accelerate.amazonaws.com/u',headers:{}}]}))}});
    if (request.method === 'PUT') return {status:200,body:Buffer.alloc(0)};
    if (request.method === 'POST') return jsonResponse({data:{task_id:'a'}});
    return jsonResponse({data:{task_status:'running'}});
  },async()=>{});
  await assert.rejects(client.generate({shopper:image,garment:image,category:'shirt'},new AbortController().signal),error=>error.code === 'generation_timed_out');
});

async function withServer(client,fn,overrides = {}) {
  const cfg = Object.assign(config(),overrides);
  const app = createApp(cfg,{client,now:overrides.now || Date.now});
  const server = http.createServer(app.handler);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const api = async(path,{auth = token,method = 'GET',body,contentType = 'application/json'} = {}) => {
    const response = await fetch(origin+path,{method,headers:{...(auth ? {Authorization:`Bearer ${auth}`} : {}),...(body !== undefined ? {'Content-Type':contentType} : {})},...(body !== undefined ? {body:typeof body === 'string' ? body : JSON.stringify(body)} : {})});
    return {status:response.status,data:await response.json(),headers:response.headers};
  };
  try { await fn(api); } finally { app.close(); await new Promise(resolve=>server.close(resolve)); }
}

async function settledJob(api,id) {
  for (let i = 0; i < 20; i++) {
    const response = await api(`/v1/tryons/${id}`);
    if (response.data.status !== 'processing') return response;
    await new Promise(resolve=>setTimeout(resolve,1));
  }
  throw new Error('Mock job did not settle');
}

test('HTTP contract enforces bearer auth, input shape and JSON media type',async()=>{
  await withServer({generate:async()=>({previewImageBase64:'safe',previewMimeType:'image/png'})},async api=>{
    assert.equal((await api('/healthz',{auth:null})).status,200);
    assert.equal((await api('/v1/tryons',{method:'POST',auth:null,body:input('shirt')})).status,401);
    assert.equal((await api('/v1/tryons',{method:'POST',auth:'wrong',body:input('shirt')})).status,401);
    assert.equal((await api('/v1/tryons',{method:'POST',body:input('shirt'),contentType:'text/plain'})).status,415);
    assert.equal((await api('/v1/tryons',{method:'POST',body:'{'})).data.error,'invalid_json');
    assert.equal((await api('/v1/tryons',{method:'POST',body:{...input('shirt'),url:'http://localhost'}})).data.error,'invalid_request');
    assert.equal((await api('/v1/tryons',{method:'POST',body:input('pants')})).data.error,'invalid_category');
    assert.equal((await api('/v1/tryons',{method:'POST',body:{...input('shirt'),shopperImageBase64:'nope'}})).status,400);
    const accepted = await api('/v1/tryons',{method:'POST',body:input('shirt')});
    assert.equal(accepted.status,202); assert.equal(accepted.data.status,'processing'); assert.match(accepted.data.id,/^[a-f0-9]{32}$/);
    const complete = await settledJob(api,accepted.data.id);
    assert.equal(complete.data.status,'success'); assert.equal(complete.data.previewImageBase64,'safe');
    assert.equal(complete.headers.get('cache-control'),'no-store');
    assert.equal((await api(`/v1/tryons/${accepted.data.id}`,{auth:'wrong'})).status,401);
    assert.equal((await api(`/v1/tryons/${accepted.data.id}`,{method:'DELETE'})).data.status,'deleted');
    assert.equal((await api(`/v1/tryons/${accepted.data.id}`)).status,404);
  });
});

test('HTTP job errors are sanitized and expired results are deleted',async()=>{
  let clock = 1000;
  await withServer({generate:async()=>{throw new Error('secret provider key and raw response');}},async api=>{
    const accepted = await api('/v1/tryons',{method:'POST',body:input('jacket')});
    const result = await settledJob(api,accepted.data.id);
    assert.deepEqual(result.data,{id:accepted.data.id,status:'error',error:'provider_unavailable'});
    clock += 16 * 60 * 1000;
    assert.equal((await api(`/v1/tryons/${accepted.data.id}`)).status,404);
  },{now:()=>clock});
});

test('HTTP concurrency and rate limits bound provider credit consumption',async()=>{
  let release;
  const paused = new Promise(resolve=>{release=resolve;});
  await withServer({generate:async()=>{await paused;return {}; }},async api=>{
    const first = await api('/v1/tryons',{method:'POST',body:input('shirt')});
    assert.equal(first.status,202);
    assert.equal((await api('/v1/tryons',{method:'POST',body:input('shirt')})).data.error,'capacity_reached');
    release(); await settledJob(api,first.data.id);
    const second = await api('/v1/tryons',{method:'POST',body:input('shirt')});
    assert.equal(second.status,202); await settledJob(api,second.data.id);
    assert.equal((await api('/v1/tryons',{method:'POST',body:input('shirt')})).data.error,'rate_limited');
  },{maxConcurrentJobs:1,requestsPerMinute:2});
});

/** Opt-in paid-provider proof. Never part of npm test. No Lens Studio network access. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { randomBytes } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeInputImage, inspectImage, loadConfig, ProxyError, requestBytes, YouCamClient } from '../server.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const args = process.argv.slice(2);
const argument = name => { const index = args.indexOf(name); return index < 0 ? undefined : args[index+1]; };
const envPath = argument('--env-file');
const selected = argument('--category') || 'both';
if (!envPath || !['shirt','jacket','both'].includes(selected)) {
  console.error('Usage: node test/live-proof.mjs --env-file <private .env path> [--category shirt|jacket|both] [--media-host <verified exact public hostname>]');
  process.exit(2);
}
const outputDir = resolve(projectRoot,'Assets/LiveEvidence');
await mkdir(outputDir,{recursive:true});
const privateEnv = parseEnv(await readFile(envPath,'utf8'));
// A random per-run proxy token is not written or printed. Only the server adapter is exercised here.
const config = loadConfig({YOUCAM_API_KEY:privateEnv.YOUCAM_API_KEY,STORETRYON_PROXY_TOKEN:randomBytes(32).toString('hex'),
  ...(argument('--media-host') ? {YOUCAM_MEDIA_HOSTS:argument('--media-host')} : {})});
delete privateEnv.YOUCAM_API_KEY;
const shopper = decodeInputImage((await readFile(resolve(projectRoot,'Assets/Samples/shopper-synthetic.png'))).toString('base64'));

for (const category of selected === 'both' ? ['shirt','jacket'] : [selected]) {
  const metadataPath = resolve(outputDir,`${category}-live-proof.json`);
  try {
    const prior = JSON.parse(await readFile(metadataPath,'utf8'));
    if (prior.status === 'success') {
      console.log(JSON.stringify({category,status:'already_proven',detail:'Existing successful evidence retained; no duplicate paid request.'}));
      continue;
    }
  } catch { /* Missing or previous failed evidence does not imply success. */ }
  const garment = decodeInputImage((await readFile(resolve(projectRoot,`Assets/Samples/${category}-synthetic.png`))).toString('base64'));
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const mediaHosts = new Set();
  const requests = [];
  let phase = 'registering-files';
  const record = {
    category,garmentCategory:category === 'shirt' ? 'upper_body' : 'outer',
    provider:'YouCam Clothes V4',inputOrigin:'OpenAI imagegen synthetic shopper and garment fixtures',
    inputShopper:'Assets/Samples/shopper-synthetic.png',inputGarment:`Assets/Samples/${category}-synthetic.png`,
    startedAt,status:'processing',proofScope:'Real standalone backend adapter request; not Lens end-to-end or hardware capture proof',
  };
  const transport = async request => {
    const url = new URL(request.url);
    if (url.hostname === 'yce-api-01.makeupar.com') {
      phase = request.method === 'POST' && url.pathname.endsWith('/file') ? 'registering-files' : request.method === 'POST' ? 'submitting-task' : 'polling-task';
    } else phase = request.method === 'PUT' ? 'uploading-input' : 'downloading-output';
    console.log(JSON.stringify({category,phase,elapsedSeconds:Math.round((Date.now()-started)/1000)}));
    const response = await requestBytes(request);
    const item = {phase,httpStatus:response.status};
    if (url.hostname === 'yce-api-01.makeupar.com') {
      try {
        const parsed = JSON.parse(response.body.toString('utf8'));
        item.providerStatus = typeof parsed.status === 'number' ? parsed.status : undefined;
        const code = parsed.error_code ?? parsed.error?.code ?? parsed.data?.error?.code ?? parsed.code;
        if (typeof code === 'number' || (typeof code === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(code))) item.providerErrorCode = code;
        const status = parsed.data?.task_status;
        if (['running','success','error','pending','queued'].includes(status)) item.taskStatus = status;
        const files = parsed.data?.files ?? parsed.files;
        for (const file of Array.isArray(files) ? files : []) for (const upload of file.requests || []) {
          try { mediaHosts.add(new URL(upload.url).hostname); } catch {}
        }
        if (parsed.data?.results?.url) {
          try { mediaHosts.add(new URL(parsed.data.results.url).hostname); } catch {}
        }
      } catch { /* Never log raw response bodies. */ }
    }
    requests.push(item);
    return response;
  };
  const deadline = AbortSignal.timeout(config.jobTimeoutMs);
  try {
    const result = await new YouCamClient(config,transport).generate({shopper,garment,category},deadline);
    const bytes = Buffer.from(result.previewImageBase64,'base64');
    const dimensions = inspectImage(bytes,false);
    const outputName = `${category}-youcam-live.${result.previewMimeType === 'image/png' ? 'png' : 'jpg'}`;
    await writeFile(resolve(outputDir,outputName),bytes);
    Object.assign(record,{status:'success',finishedAt:new Date().toISOString(),elapsedSeconds:Number(((Date.now()-started)/1000).toFixed(2)),
      outputFile:`Assets/LiveEvidence/${outputName}`,outputBytes:bytes.length,width:dimensions.width,height:dimensions.height,outputMimeType:result.previewMimeType,observedMediaHosts:[...mediaHosts],requests});
    await writeFile(metadataPath,JSON.stringify(record,null,2)+'\n');
    console.log(JSON.stringify({category,status:'success',elapsedSeconds:record.elapsedSeconds,width:dimensions.width,height:dimensions.height,evidence:`Assets/LiveEvidence/${category}-live-proof.json`}));
  } catch (error) {
    const code = deadline.aborted ? 'generation_timed_out' : error instanceof ProxyError ? error.code : 'transport_failed';
    Object.assign(record,{status:'error',error:code,failedPhase:phase,finishedAt:new Date().toISOString(),elapsedSeconds:Number(((Date.now()-started)/1000).toFixed(2)),observedMediaHosts:[...mediaHosts],requests});
    await writeFile(metadataPath,JSON.stringify(record,null,2)+'\n');
    console.log(JSON.stringify({category,status:'error',error:code,failedPhase:phase,observedMediaHosts:[...mediaHosts],requests,evidence:`Assets/LiveEvidence/${category}-live-proof.json`}));
    process.exitCode = 1;
    break; // No automatic retry or second category spend after an unexplained first failure.
  }
}

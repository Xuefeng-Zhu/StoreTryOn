import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const scenes=JSON.parse(await readFile('narration/script.json','utf8'));
const manifest=[];
for(const scene of scenes){
 const textPath=`narration/${scene.id}.txt`;
 await writeFile(textPath,scene.spoken+'\n');
 const say=spawnSync('/usr/bin/say',['-v','Samantha','-r','170','-f',textPath,'-o',`narration/${scene.id}.aiff`],{encoding:'utf8'});
 if(say.status!==0)throw new Error(`Local speech failed for ${scene.id}: ${say.stderr}`);
 const audio=`public/audio/${scene.id}.wav`;
 const convert=spawnSync('/opt/homebrew/bin/ffmpeg',['-y','-hide_banner','-loglevel','error','-i',`narration/${scene.id}.aiff`,'-ar','48000','-ac','1','-c:a','pcm_s16le',audio],{encoding:'utf8'});
 if(convert.status!==0)throw new Error(`Narration conversion failed: ${convert.stderr}`);
 const probe=spawnSync('/opt/homebrew/bin/ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',audio],{encoding:'utf8'});
 const audioSeconds=Number(probe.stdout.trim());
 if(!Number.isFinite(audioSeconds))throw new Error('Audio duration missing.');
 if(audioSeconds>scene.duration-0.2)throw new Error(`${scene.id} narration exceeds its scene: ${audioSeconds}s / ${scene.duration}s`);
 const words=scene.captions.split(/\s+/);
 const captions=[];
 const lead=250;
 const end=Math.round(audioSeconds*1000);
 for(let i=0;i<words.length;i+=6){
  const j=Math.min(words.length,i+6);
  captions.push({text:words.slice(i,j).join(' '),startMs:Math.round(lead+(end-lead)*i/words.length),endMs:Math.round(lead+(end-lead)*j/words.length),timestampMs:null,confidence:null,pageBreakAfter:true});
 }
 await writeFile(`narration/${scene.id}-captions.json`,JSON.stringify(captions,null,2)+'\n');
 manifest.push({id:scene.id,voice:'Samantha',source:'local macOS say',rateWordsPerMinute:170,audioSeconds,sceneSeconds:scene.duration,captionTiming:'Editorial phrase timings proportional to the known synthesized narration; review playback before export.'});
 console.log(JSON.stringify(manifest[manifest.length-1]));
}
await writeFile('narration/manifest.json',JSON.stringify(manifest,null,2)+'\n');

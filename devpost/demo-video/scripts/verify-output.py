#!/usr/bin/env python3
"""Validate a local final render; requires ffmpeg/ffprobe and Pillow."""
import array, hashlib, json, math, pathlib, re, shutil, subprocess, sys
root = pathlib.Path(__file__).resolve().parents[1]
video = root / 'out/storetryon-demo.mp4'
out = root / 'out'
ffmpeg = shutil.which('ffmpeg') or '/opt/homebrew/bin/ffmpeg'
ffprobe = shutil.which('ffprobe') or '/opt/homebrew/bin/ffprobe'
def run(args):

    result=subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode:
        raise RuntimeError(result.stderr.decode())
    return result
probe = json.loads(run([ffprobe, '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(video)]).stdout)
streams = probe['streams']; v = next(s for s in streams if s['codec_type']=='video'); a = next(s for s in streams if s['codec_type']=='audio')
assert v['codec_name']=='h264' and a['codec_name']=='aac'
assert (v['width'],v['height'],v['avg_frame_rate'])==(1920,1080,'30/1')
assert abs(float(probe['format']['duration'])-114)<0.1
assert int(v['nb_frames'])==3420
full = run([ffmpeg, '-hide_banner', '-v', 'error', '-xerror', '-i', str(video), '-f', 'null', '-'])
black = run([ffmpeg, '-hide_banner', '-i', str(video), '-vf', 'blackdetect=d=0.1:pix_th=0.10:pic_th=0.98', '-an', '-f', 'null', '-'])
black_intervals = [line.strip() for line in black.stderr.decode().splitlines() if 'black_start:' in line]
assert not black_intervals, black_intervals
pcm = run([ffmpeg, '-hide_banner', '-v', 'error', '-i', str(video), '-map', '0:a:0', '-ac', '1', '-ar', '48000', '-f', 'f32le', '-']).stdout
samples=array.array('f'); samples.frombytes(pcm)
if sys.byteorder!='little': samples.byteswap()
peak=max(abs(s) for s in samples); clipped=sum(abs(s)>=1 for s in samples)
assert clipped==0
manifest=json.loads((root/'narration/manifest.json').read_text())
assert all(s['audioSeconds']<s['sceneSeconds'] for s in manifest)
frames=[90,300,840,1110,1500,1950,2025,2100,2550,2670,3000,3330]
select='+'.join(f'eq(n,{f})' for f in frames)
font='/System/Library/Fonts/Supplemental/Arial.ttf'
vf=f"select='{select}',scale=640:360,tile=4x3"
run([ffmpeg,'-y','-hide_banner','-v','error','-i',str(video),'-vf',vf,'-frames:v','1',str(out/'storetryon-demo-contact-sheet.png')])
from PIL import Image, ImageDraw, ImageFont
sheet=Image.open(out/'storetryon-demo-contact-sheet.png').convert('RGB')
draw=ImageDraw.Draw(sheet);face=ImageFont.truetype(font,20)
for i,frame in enumerate(frames):
    x=(i%4)*640+10;y=(i//4)*360+10
    text=f'{frame/30:.1f}s · frame {frame}'
    box=draw.textbbox((x,y),text,font=face)
    draw.rectangle((box[0]-5,box[1]-3,box[2]+5,box[3]+3),fill='#071d18')
    draw.text((x,y),text,font=face,fill='white')
sheet.save(out/'storetryon-demo-contact-sheet.png')
report={
 'file':video.name,'sha256':hashlib.sha256(video.read_bytes()).hexdigest(),'bytes':video.stat().st_size,
 'durationSeconds':float(probe['format']['duration']),'frames':int(v['nb_frames']),'width':v['width'],'height':v['height'],'fps':v['avg_frame_rate'],
 'videoCodec':v['codec_name'],'pixelFormat':v['pix_fmt'],'audioCodec':a['codec_name'],'audioChannels':a['channels'],'audioSampleRate':int(a['sample_rate']),
 'fullDecodePassed':True,'decodeErrors':full.stderr.decode().strip(),'blackDetect':{'minimumSeconds':0.1,'pixelThreshold':0.10,'pictureThreshold':0.98,'intervals':black_intervals},
 'audioPeakDbfs':round(20*math.log10(peak),3),'audioClippedSamples':clipped,'allNarrationTracksFit':True,'narration':manifest,
 'contactSheetFrames':frames,'visualReview':'Pending inspection of final contact sheet and sampled full-resolution frames.','subjectiveAudioReview':'Not claimed; PCM peak/clipping, valid decoding and measured narration timing checked.',
 'evidenceBoundary':'Lens Studio SPECS preview with synthetic input photos. Successful real YouCam shirt API call; no physical-device claim. Entire observed processing wait retained at 1x.'
}
(out/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:report[k] for k in ['file','durationSeconds','bytes','videoCodec','audioCodec','fullDecodePassed','audioPeakDbfs','audioClippedSamples','allNarrationTracksFit']},indent=2))

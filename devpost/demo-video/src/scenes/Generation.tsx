import {Audio} from '@remotion/media';
import {staticFile,useVideoConfig} from 'remotion';
import {BasicCaptions} from '../basic-captions';
import {Frame,Headline,PreviewFootage,colors} from '../Frame';
export const Generation=()=>{const{fps}=useVideoConfig();return <Frame chapter="The real YouCam request">
 <Headline step="03 / Photo-based try-on" title={'Photos in.\nA new look out.'} description="HTTPS upload → Clothes V4 task → polling → downloaded image."/>
 <PreviewFootage src="media/live-flow.mp4" startSeconds={3.8} sourceSeconds={30} holdLabel={false}/>
 <div style={{position:'absolute',left:95,top:725,fontSize:26,color:colors.mint}}>Provider API key stays on the server.</div>
 <div style={{position:'absolute',left:95,top:778,fontSize:25,color:colors.muted}}>Real call · continuous recording at 1×</div>
 <Audio volume={0.5} src={staticFile('audio/generation.wav')} premountFor={fps}/>
 <BasicCaptions name="Generation captions" premountFor={fps} width={1720} style={{position:'absolute',left:100,bottom:68}} captions={[
  {
    "text": "That action sends both photos over",
    "startMs": 250,
    "endMs": 2549,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  },
  {
    "text": "HTTPS to the protected proxy, which",
    "startMs": 2549,
    "endMs": 4849,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  },
  {
    "text": "keeps the YouCam key on the",
    "startMs": 4849,
    "endMs": 7148,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  },
  {
    "text": "server. It uploads the images, creates",
    "startMs": 7148,
    "endMs": 9447,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  },
  {
    "text": "a Clothes V4 task, polls for",
    "startMs": 9447,
    "endMs": 11747,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  },
  {
    "text": "completion, and downloads the result. The",
    "startMs": 11747,
    "endMs": 14046,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  },
  {
    "text": "on-screen stages reflect that work, with",
    "startMs": 14046,
    "endMs": 16345,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  },
  {
    "text": "no fake percentage.",
    "startMs": 16345,
    "endMs": 17495,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  }
]}/>
 </Frame>};

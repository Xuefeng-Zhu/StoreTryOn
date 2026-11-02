import {Audio} from '@remotion/media';
import {staticFile,useVideoConfig} from 'remotion';
import {BasicCaptions} from '../basic-captions';
import {Frame,Headline,PreviewFootage} from '../Frame';
export const Result=()=>{const{fps}=useVideoConfig();return <Frame chapter="A preview worth saving">
 <Headline step="04 / Result + save" title={'See the look.\nSave the piece.'} description="Compare the generated preview with its garment and add both photos to the shopping list."/>
 <PreviewFootage src="media/live-flow.mp4" startSeconds={34} sourceSeconds={6}/>
 <Audio volume={0.5} src={staticFile('audio/result.wav')} premountFor={fps}/>
 <BasicCaptions name="Result captions" premountFor={fps} width={1720} style={{position:'absolute',left:100,bottom:68}} captions={[
  {
    "text": "The returned image is a real",
    "startMs": 250,
    "endMs": 1956,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  },
  {
    "text": "YouCam result. I compare it with",
    "startMs": 1956,
    "endMs": 3661,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  },
  {
    "text": "the garment, then add it to",
    "startMs": 3661,
    "endMs": 5367,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  },
  {
    "text": "my shopping list. A second tap",
    "startMs": 5367,
    "endMs": 7072,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  },
  {
    "text": "cannot save the same result twice.",
    "startMs": 7072,
    "endMs": 8778,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  }
]}/>
 </Frame>};

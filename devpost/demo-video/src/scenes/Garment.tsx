import {Audio} from '@remotion/media';
import {staticFile,useVideoConfig} from 'remotion';
import {BasicCaptions} from '../basic-captions';
import {Frame,Headline,PreviewFootage} from '../Frame';
export const Garment=()=>{const{fps}=useVideoConfig();return <Frame chapter="Capture. Review. Choose.">
 <Headline step="02 / The garment" title={'A shirt\nworth a look.'} description="Choose the category and inspect the garment photo before trying it on."/>
 <PreviewFootage src="media/live-flow.mp4" startSeconds={3.2} sourceSeconds={0.7} playbackRate={0.25}/>
 <Audio volume={0.5} src={staticFile('audio/garment.wav')} premountFor={fps}/>
 <BasicCaptions name="Garment captions" premountFor={fps} width={1720} style={{position:'absolute',left:100,bottom:68}} captions={[
  {
    "text": "I select Shirt and load the",
    "startMs": 250,
    "endMs": 2094,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  },
  {
    "text": "garment photo. The review lets me",
    "startMs": 2094,
    "endMs": 3937,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  },
  {
    "text": "inspect it before sending. Only Try",
    "startMs": 3937,
    "endMs": 5781,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  },
  {
    "text": "it on starts an API request.",
    "startMs": 5781,
    "endMs": 7624,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  }
]}/>
 </Frame>};

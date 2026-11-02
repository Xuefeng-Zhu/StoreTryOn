import {Audio} from '@remotion/media';
import {staticFile,useVideoConfig} from 'remotion';
import {BasicCaptions} from '../basic-captions';
import {Frame,Headline,PreviewFootage} from '../Frame';
export const Shopper=()=>{const{fps}=useVideoConfig();return <Frame chapter="Your photo, once per visit">
 <Headline step="01 / Your photo" title={'One photo.\nEvery garment.'} description="Load the shopper photo, review it, and continue. The visit keeps that photo ready."/>
 <PreviewFootage src="media/live-flow.mp4" startSeconds={2.4} sourceSeconds={0.7} playbackRate={0.25}/>
 <Audio volume={0.5} src={staticFile('audio/shopper.wav')} premountFor={fps}/>
 <BasicCaptions name="Shopper captions" premountFor={fps} width={1720} style={{position:'absolute',left:100,bottom:68}} captions={[
  {
    "text": "This walkthrough is Lens Studio’s SPECS",
    "startMs": 250,
    "endMs": 2239,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  },
  {
    "text": "preview, using clearly labelled synthetic photos.",
    "startMs": 2239,
    "endMs": 4227,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  },
  {
    "text": "I load the shopper photo once.",
    "startMs": 4227,
    "endMs": 6216,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  },
  {
    "text": "The Lens reuses it for the",
    "startMs": 6216,
    "endMs": 8204,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  },
  {
    "text": "rest of the visit.",
    "startMs": 8204,
    "endMs": 9530,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  }
]}/>
 </Frame>};

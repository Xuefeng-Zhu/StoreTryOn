import {Audio} from '@remotion/media';
import {staticFile,useVideoConfig} from 'remotion';
import {BasicCaptions} from '../basic-captions';
import {Frame,Headline,PreviewFootage} from '../Frame';
export const ShoppingList=()=>{const{fps}=useVideoConfig();return <Frame chapter="Keep your finds together">
 <Headline step="05 / Shopping list" title={'The pieces\nto return to.'} description="Browse saved photo cards, open both images, and confirm before clearing the list."/>
 <PreviewFootage src="media/live-flow.mp4" startSeconds={40.5} sourceSeconds={6}/>
 <Audio volume={0.5} src={staticFile('audio/list.wav')} premountFor={fps}/>
 <BasicCaptions name="List captions" premountFor={fps} width={1720} style={{position:'absolute',left:100,bottom:68}} captions={[
  {
    "text": "Local storage keeps JPEG thumbnails instead",
    "startMs": 250,
    "endMs": 2494,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  },
  {
    "text": "of expiring links. I open a",
    "startMs": 2494,
    "endMs": 4737,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  },
  {
    "text": "saved item to see both photos.",
    "startMs": 4737,
    "endMs": 6981,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  },
  {
    "text": "Clearing the list requires confirmation.",
    "startMs": 6981,
    "endMs": 8851,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  }
]}/>
 </Frame>};

import {Audio} from '@remotion/media';
import {staticFile,useVideoConfig} from 'remotion';
import {BasicCaptions} from '../basic-captions';
import {Frame,colors} from '../Frame';
export const Outro=()=>{const{fps}=useVideoConfig();return <Frame chapter="Capture · Try on · Save" synthetic={false}>
 <div style={{position:'absolute',left:95,top:260,fontSize:140,fontWeight:700,letterSpacing:-6}}>StoreTryOn</div>
 <div style={{position:'absolute',left:100,top:455,fontSize:59,color:colors.mint}}>See the look. Keep the find.</div>
 <div style={{position:'absolute',left:102,top:615,fontSize:34,lineHeight:1.6,color:colors.muted}}>Recorded in Lens Studio · SPECS preview<br/>Synthetic input photos · real YouCam generation</div>
 <Audio volume={0.5} src={staticFile('audio/outro.wav')} premountFor={fps}/>
 <BasicCaptions name="Closing captions" premountFor={fps} width={1720} style={{position:'absolute',left:100,bottom:68}} captions={[
  {
    "text": "Capture, try on, save. Preview appearance.",
    "startMs": 250,
    "endMs": 2886,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  },
  {
    "text": "Check fit in store.",
    "startMs": 2886,
    "endMs": 4644,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  }
]}/>
 </Frame>};

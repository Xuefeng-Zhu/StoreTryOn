import {Audio} from '@remotion/media';
import {staticFile,useVideoConfig} from 'remotion';
import {BasicCaptions} from '../basic-captions';
import {Frame,Headline,OutputPhoto,colors} from '../Frame';
export const Intro=()=>{const{fps}=useVideoConfig();return <Frame chapter="See the look. Keep the find.">
 <Headline step="In-store shopping" title={'Try it on.\nKeep the look.'} description="A photo-based try-on and shopping list, built as a SPECS Lens." />
 <OutputPhoto kind="shirt" left={910} top={160} width={425} height={650}/><OutputPhoto kind="jacket" left={1350} top={160} width={425} height={650}/>
 <div style={{position:'absolute',left:915,top:827,fontSize:24,color:colors.mint}}>Earlier YouCam outputs · synthetic shopper</div>
 <Audio volume={0.5} src={staticFile('audio/intro.wav')} premountFor={fps}/>
 <BasicCaptions name="Opening captions" premountFor={fps} width={1720} style={{position:'absolute',left:100,bottom:68}} captions={[
  {
    "text": "StoreTryOn helps shoppers preview a shirt",
    "startMs": 250,
    "endMs": 2226,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  },
  {
    "text": "or jacket, then keep a shopping",
    "startMs": 2226,
    "endMs": 4203,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  },
  {
    "text": "list, all in a SPECS Lens.",
    "startMs": 4203,
    "endMs": 6179,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  }
]}/>
 </Frame>};

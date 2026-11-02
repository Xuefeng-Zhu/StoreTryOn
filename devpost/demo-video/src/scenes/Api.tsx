import {Audio} from '@remotion/media';
import {staticFile,useVideoConfig} from 'remotion';
import {BasicCaptions} from '../basic-captions';
import {Frame,colors} from '../Frame';
export const Api=()=>{const{fps}=useVideoConfig();return <Frame chapter="How YouCam powers the experience" synthetic={false}>
 <div style={{position:'absolute',left:95,top:210,fontSize:88,fontWeight:700,letterSpacing:-3}}>YouCam AI Clothes V4</div>
 <div style={{position:'absolute',left:95,top:345,display:'flex',gap:22}}>
  <div style={{width:780,padding:32,border:`1px solid ${colors.line}`,borderRadius:20}}><div style={{fontSize:31,color:colors.muted}}>SHIRTS</div><div style={{fontSize:58,color:colors.mint,marginTop:15}}>upper_body</div></div>
  <div style={{width:780,padding:32,border:`1px solid ${colors.line}`,borderRadius:20}}><div style={{fontSize:31,color:colors.muted}}>JACKETS</div><div style={{fontSize:58,color:colors.mint,marginTop:15}}>outer</div></div>
 </div>
 <div style={{position:'absolute',left:95,top:615,fontSize:37,lineHeight:1.5,color:colors.foreground}}>Photos → HTTPS proxy → async V4 task → image bytes → local JPEG list</div>
 <div style={{position:'absolute',left:95,top:715,fontSize:31,color:colors.muted}}>Jackets layer over the existing outfit. Generated appearance is not a fit measurement.</div>
 <Audio volume={0.5} src={staticFile('audio/api.wav')} premountFor={fps}/>
 <BasicCaptions name="API captions" premountFor={fps} width={1720} style={{position:'absolute',left:100,bottom:68}} captions={[
  {
    "text": "YouCam AI Clothes V4 uses upper_body",
    "startMs": 250,
    "endMs": 2513,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  },
  {
    "text": "for shirts and outer for jackets,",
    "startMs": 2513,
    "endMs": 4777,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  },
  {
    "text": "layering jackets over the existing outfit.",
    "startMs": 4777,
    "endMs": 7040,
    "timestampMs": null,
    "confidence": null,
    "pageBreakAfter": true
  }
]}/>
 </Frame>};

import React from 'react';
import {AbsoluteFill, CanvasImage, Freeze, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Video} from '@remotion/media';
export const colors = {background: '#071d18', foreground: '#effbf5', mint: '#93edc8', muted: '#a7c3b7', line: '#29483b'};
export const font = 'Arial, Helvetica, sans-serif';

export const Frame: React.FC<{children: React.ReactNode; chapter: string; synthetic?: boolean}> = ({children, chapter, synthetic = true}) => (
  <AbsoluteFill style={{background: colors.background, color: colors.foreground, fontFamily: font}}>
    <div style={{position:'absolute',top:52,left:88,fontSize:32,fontWeight:700,letterSpacing:-1}}>StoreTryOn<span style={{color:colors.mint}}> / </span><span style={{color:colors.muted,fontWeight:400,fontSize:27}}>{chapter}</span></div>
    <div style={{position:'absolute',top:49,right:85,color:colors.mint,fontSize:28,padding:'13px 22px',border:`1px solid ${colors.line}`,borderRadius:30}}>Lens Studio · SPECS preview</div>
    {synthetic ? <div style={{position:'absolute',left:88,bottom:25,color:colors.muted,fontSize:22}}>Synthetic input photos · real preview recording</div> : null}
    {children}
  </AbsoluteFill>
);

export const Headline: React.FC<{step: string; title: string; description: string}> = ({step,title,description}) => {
 const frame=useCurrentFrame();const {fps}=useVideoConfig();
 return <div style={{position:'absolute',left:92,top:218,width:640,opacity:interpolate(frame,[0,0.4*fps],[0,1],{extrapolateRight:'clamp'})}}>
  <div style={{color:colors.mint,fontSize:29,letterSpacing:3,textTransform:'uppercase',marginBottom:28}}>{step}</div>
  <div style={{fontSize:92,fontWeight:700,lineHeight:1.03,letterSpacing:-4,whiteSpace:'pre-line'}}>{title}</div>
  <div style={{fontSize:36,lineHeight:1.42,color:colors.muted,marginTop:35,maxWidth:570}}>{description}</div>
 </div>;
};

/** Crops real recorded preview pixels. Optional final-frame holds are explicitly labelled. */
export const PreviewFootage: React.FC<{src:string;startSeconds:number;sourceSeconds:number;holdLabel?:boolean;playbackRate?:number}> = ({src,startSeconds,sourceSeconds,holdLabel=true,playbackRate=1}) => {
 const frame=useCurrentFrame();const {fps}=useVideoConfig();
 const maxFrame=Math.max(0,Math.floor(sourceSeconds*fps)-1);
 const sourceFrame=Math.floor(frame*playbackRate);
 return <div style={{position:'absolute',left:793,top:137,width:1030,height:790,overflow:'hidden',borderRadius:24,border:`1px solid ${colors.line}`,background:'#10251e'}}>
  <div style={{position:'absolute',width:1264,height:1144,left:79,top:0,scale:0.69,transformOrigin:'top left',overflow:'hidden'}}>
   <Freeze frame={Math.min(sourceFrame,maxFrame)}>
    <Video src={staticFile(src)} trimBefore={Math.round(startSeconds*fps)} premountFor={fps} muted objectFit="fill" style={{position:'absolute',left:0,top:0,width:1264,height:1144}} />
   </Freeze>
  </div>
  {(holdLabel && sourceFrame>maxFrame) || playbackRate!==1 ? <div style={{position:'absolute',bottom:16,left:22,fontSize:22,color:'white',background:'rgba(0,0,0,.65)',padding:'8px 12px',borderRadius:8}}>{sourceFrame>maxFrame ? 'Paused for explanation' : `${playbackRate}× input actions`}</div> : null}
 </div>;
};

export const OutputPhoto:React.FC<{kind:'shirt'|'jacket';left:number;top:number;width:number;height:number}> = ({kind,left,top,width,height}) => <CanvasImage src={staticFile(`media/${kind}-youcam-live.jpg`)} style={{position:'absolute',left,top,width,height,objectFit:'contain',borderRadius:18}} />;

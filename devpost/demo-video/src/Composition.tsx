import {Series,useVideoConfig} from 'remotion';
import {Intro} from './scenes/Intro';
import {Shopper} from './scenes/Shopper';
import {Garment} from './scenes/Garment';
import {Generation} from './scenes/Generation';
import {Result} from './scenes/Result';
import {ShoppingList} from './scenes/ShoppingList';
import {Api} from './scenes/Api';
import {Outro} from './scenes/Outro';
export const StoreTryOnDemo=()=>{const{fps}=useVideoConfig();return <Series>
 <Series.Sequence name="Opening" durationInFrames={8*fps} premountFor={fps}><Intro/></Series.Sequence>
 <Series.Sequence name="Shopper photo" durationInFrames={14*fps} premountFor={fps}><Shopper/></Series.Sequence>
 <Series.Sequence name="Garment capture and review" durationInFrames={14*fps} premountFor={fps}><Garment/></Series.Sequence>
 <Series.Sequence name="Actual live YouCam call" durationInFrames={30*fps} premountFor={fps}><Generation/></Series.Sequence>
 <Series.Sequence name="Result and Add to shopping list" durationInFrames={18*fps} premountFor={fps}><Result/></Series.Sequence>
 <Series.Sequence name="Saved collection and detail" durationInFrames={14*fps} premountFor={fps}><ShoppingList/></Series.Sequence>
 <Series.Sequence name="YouCam Clothes V4 integration" durationInFrames={10*fps} premountFor={fps}><Api/></Series.Sequence>
 <Series.Sequence name="Closing" durationInFrames={6*fps} premountFor={fps}><Outro/></Series.Sequence>
 </Series>};

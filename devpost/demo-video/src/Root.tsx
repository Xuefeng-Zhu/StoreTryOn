import {Composition,Folder} from 'remotion';
import {StoreTryOnDemo} from './Composition';
import {Intro} from './scenes/Intro';
import {Shopper} from './scenes/Shopper';
import {Garment} from './scenes/Garment';
import {Generation} from './scenes/Generation';
import {Result} from './scenes/Result';
import {ShoppingList} from './scenes/ShoppingList';
import {Api} from './scenes/Api';
import {Outro} from './scenes/Outro';
export const RemotionRoot=()=> <>
 <Composition id="StoreTryOnDemo" component={StoreTryOnDemo} durationInFrames={3420} fps={30} width={1920} height={1080}/>
 <Folder name="Scenes">
  <Composition id="Intro" component={Intro} durationInFrames={240} fps={30} width={1920} height={1080}/>
  <Composition id="Shopper" component={Shopper} durationInFrames={420} fps={30} width={1920} height={1080}/>
  <Composition id="Garment" component={Garment} durationInFrames={420} fps={30} width={1920} height={1080}/>
  <Composition id="Generation" component={Generation} durationInFrames={900} fps={30} width={1920} height={1080}/>
  <Composition id="Result" component={Result} durationInFrames={540} fps={30} width={1920} height={1080}/>
  <Composition id="ShoppingList" component={ShoppingList} durationInFrames={420} fps={30} width={1920} height={1080}/>
  <Composition id="Api" component={Api} durationInFrames={300} fps={30} width={1920} height={1080}/>
  <Composition id="Outro" component={Outro} durationInFrames={180} fps={30} width={1920} height={1080}/>
 </Folder>
 </>;

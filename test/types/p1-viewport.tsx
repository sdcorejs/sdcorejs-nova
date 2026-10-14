import {useMediaQuery,useViewport} from '@sdcorejs/nova/viewport';
export function Viewport(){const matches:boolean=useMediaQuery('(min-width:640px)',{serverMatch:false,ownerWindow:null});const {width,height}=useViewport({serverWidth:0,serverHeight:0});const maybe:number|undefined=width;return <>{String(matches)}{maybe}{height}</>;}

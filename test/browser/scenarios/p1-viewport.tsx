import {useState} from 'react';import {useMediaQuery,useViewport} from '../../../src/hooks/viewport/index.js';
function Measurements(){const wide=useMediaQuery('(min-width:640px)',{serverMatch:false}),size=useViewport({serverWidth:0,serverHeight:0});return <><output aria-label="Wide">{String(wide)}</output><output aria-label="Width">{String(size.width)}</output></>;}
export default function Viewport(){const [show,set]=useState(true);return <><button onClick={()=>set(!show)}>Toggle</button>{show&&<Measurements/>}</>;}

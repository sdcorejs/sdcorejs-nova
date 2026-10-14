import { renderToString } from 'react-dom/server';
import { describe,expect,it } from 'vitest';
import { useMediaQuery,useViewport } from '../../src/hooks/viewport/viewport.js';
const owner={get innerWidth(){throw new Error('SSR read client width');},matchMedia(){throw new Error('SSR read client query');}} as unknown as Window;
function Probe({width,match}:{width?:number;match:boolean}) {const viewport=useViewport({serverWidth:width,ownerWindow:owner}),media=useMediaQuery('screen',{serverMatch:match,ownerWindow:owner});return <p data-width={String(viewport.width)} data-height={String(viewport.height)} data-match={String(media)}/>;}
describe('viewport server environment isolation',()=>{
  it('never reads an explicit client environment during SSR and preserves zero',()=>{expect(typeof window).toBe('undefined');expect(renderToString(<Probe width={0} match/>)).toContain('data-width="0" data-height="undefined" data-match="true"');});
  it('independent request inputs have independent SSR snapshots',()=>{const a=renderToString(<Probe width={320} match/>),b=renderToString(<Probe match={false}/>);expect(a).toContain('data-width="320"');expect(a).toContain('data-match="true"');expect(b).toContain('data-width="undefined"');expect(b).toContain('data-match="false"');});
});

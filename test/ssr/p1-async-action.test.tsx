import { renderToString } from 'react-dom/server';
import { describe,expect,it,vi } from 'vitest';
import { useAsyncAction } from '../../src/hooks/async-action/async-action.js';
import { BusyBoundary } from '../../src/components/busy-boundary/busy-boundary.js';

describe('async action server render',()=>{
  it('imports without DOM and never runs work during server render',()=>{
    expect(typeof window).toBe('undefined');expect(typeof document).toBe('undefined');
    const work=vi.fn(async()=>0);
    function Probe(){const action=useAsyncAction(work);return <p>{String(action.pending)}:{String(action.error)}</p>;}
    expect(renderToString(<Probe/>)).toContain('false<!-- -->:<!-- -->null');expect(work).not.toHaveBeenCalled();
  });
  it('busy status remains visible while consumer content and disabled actions survive SSR',()=>{
    const html=renderToString(<BusyBoundary busy label="Waiting"><button disabled>Submit</button></BusyBoundary>);
    expect(html).toContain('aria-busy="true"');expect(html).toContain('role="status"');expect(html).toContain('Waiting');expect(html).toContain('disabled=""');expect(html).not.toContain('<script');expect(html).not.toContain('inert');
  });
});

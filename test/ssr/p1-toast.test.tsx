import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from '../../src/providers/toast/toast.js';
import { NovaProvider } from '../../src/providers/nova/nova-provider.js';
afterEach(()=>vi.restoreAllMocks());
function Access(){const api=useToast();return <span>{typeof api.show+':'+typeof api.update+':'+typeof api.dismiss}</span>;}
describe('toast server ownership',()=>{
 it('provider import/render needs no browser globals, timers or auto-notifications',()=>{expect(typeof document).toBe('undefined');const timer=vi.spyOn(globalThis,'setTimeout');const html=renderToString(<ToastProvider><Access/></ToastProvider>);expect(html).toContain('function:function:function');expect(html).not.toContain('nova-toast');expect(timer).not.toHaveBeenCalled();});
 it('request roots and localized providers remain deterministic without queued state leaking',()=>{const tree=<NovaProvider locale="vi" theme="dark"><ToastProvider maxVisible={2} offset="2rem"><span>Body</span></ToastProvider></NovaProvider>;const first=renderToString(tree);expect(renderToString(tree)).toBe(first);expect(first).toContain('Body');expect(first).not.toContain('nova-toast');expect(first).not.toContain('--nova-toast-offset');});
 it('missing provider is a clear configuration failure on the server',()=>{expect(()=>renderToString(<Access/>)).toThrow(/ToastProvider/);});
 it('render-time invocation does not create server notifications or start a timer',()=>{function InvalidRender(){const api=useToast();const id=api.show({id:'server',title:'No server queue'});return <span>{id}</span>;}const timer=vi.spyOn(globalThis,'setTimeout');expect(renderToString(<ToastProvider><InvalidRender/></ToastProvider>)).toContain('server');expect(timer).not.toHaveBeenCalled();timer.mockRestore();});
});

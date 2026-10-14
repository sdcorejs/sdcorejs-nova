import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmProvider, useConfirm } from '../../src/providers/confirm/confirm.js';
import { NovaProvider } from '../../src/providers/nova/nova-provider.js';
afterEach(()=>vi.restoreAllMocks());
describe('confirmation server ownership',()=>{
 it('import/render never opens a dialog, reads DOM globals or starts timers',()=>{expect(typeof document).toBe('undefined');const timer=vi.spyOn(globalThis,'setTimeout');function Access(){const confirm=useConfirm();return <span>{typeof confirm}</span>;}const html=renderToString(<ConfirmProvider><Access/></ConfirmProvider>);expect(html).toContain('function');expect(html).not.toContain('alertdialog');expect(timer).not.toHaveBeenCalled();});
 it('server invocation is fulfilled cancelled with one static per-owner diagnostic and no user data',async()=>{let first!:Promise<string>,second!:Promise<string>;const warning=vi.spyOn(console,'warn').mockImplementation(()=>{});function InvalidRender(){const confirm=useConfirm();first=confirm({title:'Private user title'});second=confirm({title:'Another user title'});return <span>Body</span>;}expect(renderToString(<ConfirmProvider><InvalidRender/></ConfirmProvider>)).toContain('Body');expect(await first).toBe('cancelled');expect(await second).toBe('cancelled');expect(warning).toHaveBeenCalledTimes(1);expect(warning).toHaveBeenCalledWith(expect.stringContaining('NOVA_CONFIRM_SERVER_CALL'));expect(String(warning.mock.calls)).not.toContain('user title');});
 it('independent server provider roots keep diagnostics and render state separate',()=>{const warning=vi.spyOn(console,'warn').mockImplementation(()=>{});function InvalidRender(){const confirm=useConfirm();void confirm({title:'Request'});return null;}const tree=<NovaProvider locale="en"><ConfirmProvider><InvalidRender/></ConfirmProvider></NovaProvider>;expect(renderToString(tree)).toBe(renderToString(tree));expect(warning).toHaveBeenCalledTimes(2);});
 it('missing provider is a server configuration error',()=>{function Missing(){useConfirm();return null;}expect(()=>renderToString(<Missing/>)).toThrow(/ConfirmProvider/);});
});

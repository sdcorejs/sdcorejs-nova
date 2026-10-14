import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CopyButton } from '../../src/components/copy-button/copy-button.js';
import { ScrollArea } from '../../src/components/scroll-area/scroll-area.js';
import { useClipboard } from '../../src/hooks/clipboard/clipboard.js';
import { NovaProvider } from '../../src/providers/nova/nova-provider.js';
describe('clipboard and scrolling server contracts',()=>{
 it('hook import and render never read navigator or start clipboard work',()=>{expect(typeof document).toBe('undefined');function View(){const state=useClipboard();return <span>{String(state.pending)+':'+(state.errorMessage??'')}</span>;}vi.stubGlobal('navigator',new Proxy({},{get(){throw Error('Server navigator access');}}));try{expect(renderToString(<View/>)).toBe('<span>false:</span>');}finally{vi.unstubAllGlobals();}});
 it('copy control is deterministic, native type button and safely localized',()=>{const tree=<NovaProvider locale="en"><CopyButton text="<unsafe>"/></NovaProvider>;const html=renderToString(tree);expect(renderToString(tree)).toBe(html);expect(html).toContain('type="button"');expect(html).toContain('>Copy<');expect(html).toContain('role="status"');expect(html).not.toContain('setTimeout');expect(html).not.toContain('<unsafe>');});
 it('scroll area preserves text but cannot assert client overflow or introduce an empty tab stop on SSR',()=>{const html=renderToString(<ScrollArea label="Details">Body</ScrollArea>);expect(html).toContain('Body');expect(html).not.toContain('tabindex');expect(html).not.toContain('role="region"');expect(html).not.toContain('style=');});
 it('maxHeight is only an explicit consumer style and surface props remain',()=>{const html=renderToString(<ScrollArea maxHeight="12rem" className="consumer" data-testid="scroll" style={{color:'red'}}>Body</ScrollArea>);expect(html).toContain('max-height:12rem');expect(html).toContain('color:red');expect(html).toContain('consumer');expect(html).toContain('data-testid="scroll"');});
});

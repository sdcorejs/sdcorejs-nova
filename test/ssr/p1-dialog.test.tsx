import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { NovaProvider } from '../../src/providers/nova/nova-provider.js';
import { Dialog, Drawer, Sheet } from '../../src/components/dialog/dialog.js';

describe('dialog server boundary',()=>{
  it('open overlays mount after hydration and invoke no close/value callbacks during SSR',()=>{
    expect(typeof document).toBe('undefined');const request=vi.fn(),change=vi.fn();
    const tree=<NovaProvider theme="dark" locale="en"><Dialog title="Rename" value={true} onValueChange={change} onCloseRequest={request}><input aria-label="Draft"/></Dialog></NovaProvider>;
    const html=renderToString(tree);expect(renderToString(tree)).toBe(html);expect(html).not.toContain('role="dialog"');expect(html).not.toContain('<input');expect(request).not.toHaveBeenCalled();expect(change).not.toHaveBeenCalled();
  });
  it('closed and open Sheet/Drawer need no browser globals or eager portal content',()=>{
    for(const Component of [Sheet,Drawer])for(const open of [false,true]){
      const html=renderToString(<Component title="Options" defaultValue={open}>Private draft</Component>);
      expect(html).not.toContain('Private draft');expect(html).not.toContain('nova-sheet');
    }
  });
});

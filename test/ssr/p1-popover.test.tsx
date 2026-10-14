import type { ComponentPropsWithRef } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Popover, Tooltip } from '../../src/components/popover/popover.js';
describe('anchored overlays on the server',()=>{
  it('open popovers emit only a deterministic trigger without touching document or invoking callbacks',()=>{
    expect(typeof document).toBe('undefined');const change=vi.fn();const tree=<Popover label="Details" value={true} onValueChange={change} trigger={<button>More</button>}><input aria-label="Draft"/></Popover>;
    const html=renderToString(tree);expect(renderToString(tree)).toBe(html);expect(html).toContain('More');expect(html).not.toContain('role="dialog"');expect(html).not.toContain('<input');expect(change).not.toHaveBeenCalled();
  });
  it('tooltip server markup preserves native name and existing description without creating timers or popup content',()=>{
    const tree=<Tooltip content="Extra help"><button aria-label="Copy" aria-describedby="existing">Copy</button></Tooltip>;const html=renderToString(tree);expect(renderToString(tree)).toBe(html);expect(html).toContain('aria-label="Copy"');expect(html).toContain('aria-describedby="existing"');expect(html).not.toContain('Extra help');expect(html).not.toContain('role="tooltip"');
  });
  it('an intrinsic non-native trigger has button semantics in SSR rather than a client-only role upgrade',()=>{
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- This checks the primitive-provided role in SSR, before any client upgrade.
    const tree=<Popover trigger={<div tabIndex={0}>More</div>} label="Details">Content</Popover>;const html=renderToString(tree);expect(html).toContain('role="button"');expect(html).toContain('tabindex="0"');expect(renderToString(tree)).toBe(html);
  });

  it('custom non-native composition declares its button mode in deterministic server markup',()=>{
    function Trigger(props:ComponentPropsWithRef<'div'>){return <div {...props}/>;}
    const tree=<Popover trigger={<Trigger role="button" tabIndex={0}>More</Trigger>} label="Details">Content</Popover>;const html=renderToString(tree);expect(html).toContain('role="button"');expect(html).toContain('tabindex="0"');expect(html).not.toContain('type="button"');expect(renderToString(tree)).toBe(html);
  });

});

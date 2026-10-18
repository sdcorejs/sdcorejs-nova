import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ActionMenu, QuickActions } from '../../src/components/action-menu/action-menu.js';
describe('action menus on the server',()=>{
  it('renders a deterministic named native trigger without action execution or a portal',()=>{
    expect(typeof document).toBe('undefined');const action=vi.fn(),data={id:4};const tree=<ActionMenu data={data} label="Actions" actions={[{id:'save',label:'Save',onAction:action},{id:'group',label:'Export',children:[{id:'download',label:'Download',onAction:action}]}]}/>;const html=renderToString(tree);expect(renderToString(tree)).toBe(html);expect(html).toContain('Actions');expect(html).toContain('aria-haspopup="menu"');expect(html).toContain('type="button"');expect(html).not.toContain('role="menu"');expect(action).not.toHaveBeenCalled();
  });
  it('does not emit an empty trigger for hidden actions and keeps independent requests isolated',()=>{
    const action=vi.fn();expect(renderToString(<QuickActions data={{id:1}} label="Hidden" actions={[{id:'hidden',label:'Hidden',hidden:true,onAction:action}]}/>)).toBe('');const one=renderToString(<ActionMenu data={{id:1}} label="First" actions={[{id:'one',label:'One',onAction:action}]}/>);const two=renderToString(<ActionMenu data={{id:2}} label="Second" actions={[{id:'two',label:'Two',onAction:action}]}/>);expect(one).not.toContain('Second');expect(two).not.toContain('First');expect(action).not.toHaveBeenCalled();
  });
});

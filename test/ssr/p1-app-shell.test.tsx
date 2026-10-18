import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { AppShell, Navigation, Sidebar } from '../../src/components/app-shell/index.js';

describe('C14 server contracts', () => {
  it('renders deterministic semantic shell without browser globals or opening a portal', () => {
    expect(typeof document).toBe('undefined');
    const change = vi.fn();
    const tree = <AppShell header="Account" sidebar={<Sidebar label="Workspace" defaultMobileValue onMobileValueChange={change}>
      <Navigation label="Main navigation" currentId="files" items={[{id: 'files', label: 'Files', href: '#/files'}]}/>
    </Sidebar>}><h1>Files</h1></AppShell>;
    const html = renderToString(tree);
    expect(renderToString(tree)).toBe(html);
    expect(html).toContain('<header');
    expect(html).toContain('<main');
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain('role="dialog"');
    expect(change).not.toHaveBeenCalled();
  });
});

import { renderToString } from 'react-dom/server';
import { expect, it, vi } from 'vitest';

import { InlineEdit } from '../../src/components/inline-edit/index.js';

it('F12 server render exposes only a deterministic face without invoking editor or save', () => {
  const save = vi.fn(), editor = vi.fn();
  const tree = <InlineEdit value="Old" display="Old" revision={1} scopeKey="one" label="Tên" renderEditor={editor} onSave={save} onCommit={() => {}}/>;
  const html = renderToString(tree);
  expect(renderToString(tree)).toBe(html);
  expect(html).toContain('Chỉnh sửa Tên');
  expect(html).not.toContain('<input');
  expect(editor).not.toHaveBeenCalled();
  expect(save).not.toHaveBeenCalled();
});

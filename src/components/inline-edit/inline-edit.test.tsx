import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InlineEdit, type InlineEditCommit, type InlineEditProps } from './inline-edit.js';

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {resolve = yes; reject = no;});
  return {promise, resolve, reject};
}
function editor({draft, setDraft, conflict, resolveConflict}: Parameters<InlineEditProps<string>['renderEditor']>[0]) {
  return <><input aria-label="Draft" value={draft} onChange={event => setDraft(event.target.value)}/>
    <output aria-label="Conflict">{String(conflict)}</output>
    <button type="button" onClick={() => resolveConflict('reload')}>Reload</button>
    <button type="button" onClick={() => resolveConflict('rebase')}>Rebase</button></>;
}
const base: InlineEditProps<string> = {value: 'Old', revision: 1, scopeKey: 'one', display: 'Old', label: 'Tên', renderEditor: editor,
  onSave: async value => ({value, revision: 2}), onCommit: () => {}};
afterEach(cleanup);

describe('F12 controlled commit', () => {
  it('F12-AC01: keyboard entry focuses editor; Cancel discards draft and returns focus without saving', async () => {
    const user = userEvent.setup(), save = vi.fn(base.onSave);
    render(<InlineEdit {...base} onSave={save}/>);
    await user.tab();
    await user.keyboard('{Enter}');
    const input = screen.getByRole('textbox', {name: 'Draft'});
    expect(document.activeElement).toBe(input);
    await user.clear(input);
    await user.type(input, 'Draft');
    await user.click(screen.getByRole('button', {name: 'Hủy'}));
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', {name: 'Chỉnh sửa Tên'}));
    await user.keyboard('{Enter}');
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Old');
    expect(save).not.toHaveBeenCalled();
  });

  it('F12-AC02: singleflight save waits for matching consumer acknowledgement before closing', async () => {
    const user = userEvent.setup(), work = deferred<InlineEditCommit<string>>();
    const save = vi.fn(() => work.promise), commit = vi.fn();
    const view = render(<InlineEdit {...base} onSave={save} onCommit={commit}/>);
    await user.click(screen.getByRole('button', {name: 'Chỉnh sửa Tên'}));
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'New');
    await user.click(screen.getByRole('button', {name: 'Lưu'}));
    await user.click(screen.getByRole('button', {name: 'Lưu'}));
    expect(save).toHaveBeenCalledOnce();
    await act(async () => {work.resolve({value: 'New', revision: 2}); await Promise.resolve();});
    expect(commit).toHaveBeenCalledWith({value: 'New', revision: 2});
    expect(screen.getByRole('textbox')).toBeTruthy();
    expect((screen.getByRole('button', {name: 'Hủy'}) as HTMLButtonElement).disabled).toBe(true);
    view.rerender(<InlineEdit {...base} value="New" display="New" revision={2} onSave={save} onCommit={commit}/>);
    await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
    expect(document.activeElement).toBe(screen.getByRole('button', {name: 'Chỉnh sửa Tên'}));
  });

  it('F12-AC02: failed save keeps draft and safe error while permitting explicit retry', async () => {
    const user = userEvent.setup();
    const save = vi.fn().mockRejectedValueOnce(new Error('Secret stack')).mockResolvedValue({value: 'Draft', revision: 2});
    render(<InlineEdit {...base} onSave={save} mapError={() => 'Không thể lưu'}/>);
    await user.click(screen.getByRole('button', {name: 'Chỉnh sửa Tên'}));
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'Draft');
    await user.click(screen.getByRole('button', {name: 'Lưu'}));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Không thể lưu');
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Draft');
    await user.click(screen.getByRole('button', {name: 'Lưu'}));
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('F12-AC03: dirty remote revision is a conflict and only explicit rebase permits saving', async () => {
    const user = userEvent.setup(), save = vi.fn(base.onSave);
    const view = render(<InlineEdit {...base} onSave={save}/>);
    await user.click(screen.getByRole('button', {name: 'Chỉnh sửa Tên'}));
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'Local');
    view.rerender(<InlineEdit {...base} value="Remote" revision={2} onSave={save}/>);
    expect(screen.getByRole('status', {name: 'Conflict'}).textContent).toBe('true');
    expect((screen.getByRole('button', {name: 'Lưu'}) as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByRole('button', {name: 'Rebase'}));
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Local');
    await user.click(screen.getByRole('button', {name: 'Lưu'}));
    expect(save).toHaveBeenCalledWith('Local', expect.objectContaining({baseRevision: 2, scopeKey: 'one'}));
  });

  it('F12-AC03: a prop change during pending save aborts ownership and consumes the late result', async () => {
    const user = userEvent.setup(), work = deferred<InlineEditCommit<string>>(), commit = vi.fn();
    let signal!: AbortSignal;
    const save: InlineEditProps<string>['onSave'] = (_, context) => {signal = context.signal; return work.promise;};
    const view = render(<InlineEdit {...base} onSave={save} onCommit={commit}/>);
    await user.click(screen.getByRole('button', {name: 'Chỉnh sửa Tên'}));
    await user.click(screen.getByRole('button', {name: 'Lưu'}));
    view.rerender(<InlineEdit {...base} value="Remote" revision={2} onSave={save} onCommit={commit}/>);
    expect(signal.aborted).toBe(true);
    await act(async () => {work.resolve({value: 'Old', revision: 3}); await Promise.resolve();});
    expect(commit).not.toHaveBeenCalled();
    expect(screen.getByRole('status', {name: 'Conflict'}).textContent).toBe('true');
    await user.click(screen.getByRole('button', {name: 'Reload'}));
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Remote');
  });

  it.each(['cancel', 'unmount'] as const)('F12-AC03: %s aborts pending ownership without late commit', async action => {
    const user = userEvent.setup(), work = deferred<InlineEditCommit<string>>(), commit = vi.fn();
    let signal!: AbortSignal;
    const view = render(<InlineEdit {...base} onCommit={commit} onSave={(_, context) => {signal = context.signal; return work.promise;}}/>);
    await user.click(screen.getByRole('button', {name: 'Chỉnh sửa Tên'}));
    await user.click(screen.getByRole('button', {name: 'Lưu'}));
    if (action === 'unmount') view.unmount(); else await user.keyboard('{Escape}');
    expect(signal.aborted).toBe(true);
    await act(async () => {work.resolve({value: 'Late', revision: 3}); await Promise.resolve();});
    expect(commit).not.toHaveBeenCalled();
  });

  it('F12-AC01: disabled face cannot enter; multiline Enter never saves', async () => {
    const user = userEvent.setup(), save = vi.fn(base.onSave);
    const view = render(<InlineEdit {...base} disabled onSave={save}/>);
    await user.click(screen.getByRole('button', {name: 'Chỉnh sửa Tên'}));
    expect(screen.queryByRole('textbox')).toBeNull();
    view.rerender(<InlineEdit {...base} onSave={save} renderEditor={({draft, setDraft}) => <textarea aria-label="Draft" value={draft} onChange={event => setDraft(event.target.value)}/>}/>);
    await user.click(screen.getByRole('button', {name: 'Chỉnh sửa Tên'}));
    await user.type(screen.getByRole('textbox'), '{Enter}Tiếng Việt');
    expect(save).not.toHaveBeenCalled();
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toContain('\nTiếng Việt');
  });

  it('child Escape handling prevents cancellation of the parent editor', async () => {
    const user = userEvent.setup();
    render(<InlineEdit {...base} renderEditor={({draft, setDraft}) => <input aria-label="Draft" value={draft} onChange={event => setDraft(event.target.value)}
      onKeyDown={event => {if (event.key === 'Escape') event.preventDefault();}}/>}/>);
    await user.click(screen.getByRole('button', {name: 'Chỉnh sửa Tên'}));
    await user.keyboard('{Escape}');
    expect(screen.getByRole('textbox')).toBeTruthy();
  });

  it('an already-matching commit releases ownership so a later edit can cancel and save', async () => {
    const user = userEvent.setup(), save = vi.fn(async () => ({value: 'Old', revision: 1}));
    render(<InlineEdit {...base} onSave={save}/>);
    await user.click(screen.getByRole('button', {name: 'Chỉnh sửa Tên'}));
    await user.click(screen.getByRole('button', {name: 'Lưu'}));
    await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
    await user.click(screen.getByRole('button', {name: 'Chỉnh sửa Tên'}));
    await user.click(screen.getByRole('button', {name: 'Hủy'}));
    expect(screen.queryByRole('textbox')).toBeNull();
    await user.click(screen.getByRole('button', {name: 'Chỉnh sửa Tên'}));
    await user.click(screen.getByRole('button', {name: 'Lưu'}));
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('a retained draft callback cannot resurrect a cancelled editor or replace a pending session', async () => {
    const user = userEvent.setup(), work = deferred<InlineEditCommit<string>>();
    let retained!: (value: string) => void;
    render(<InlineEdit {...base} onSave={() => work.promise} renderEditor={args => {retained = args.setDraft; return editor(args);}}/>);
    await user.click(screen.getByRole('button', {name: 'Chỉnh sửa Tên'}));
    const old = retained;
    await user.click(screen.getByRole('button', {name: 'Hủy'}));
    act(() => old('Late'));
    expect(screen.queryByRole('textbox')).toBeNull();
    await user.click(screen.getByRole('button', {name: 'Chỉnh sửa Tên'}));
    const pending = retained;
    await user.click(screen.getByRole('button', {name: 'Lưu'}));
    act(() => pending('Late pending'));
    expect((screen.getByRole('button', {name: 'Lưu'}) as HTMLButtonElement).getAttribute('aria-disabled')).toBe('true');
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Old');
  });

  it('two draft updates in one event retain the latest value within the same edit generation', async () => {
    const user = userEvent.setup();
    render(<InlineEdit {...base} renderEditor={args => <>{editor(args)}<button onClick={() => {
      args.setDraft('first'); args.setDraft('second');
    }}>Set twice</button></>}/>);
    await user.click(screen.getByRole('button', {name: 'Chỉnh sửa Tên'}));
    await user.click(screen.getByRole('button', {name: 'Set twice'}));
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('second');
  });

  it.each(['value', 'scope'] as const)('a %s-only change invalidates pending work and consumes its late rejection', async change => {
    const user = userEvent.setup(), work = deferred<InlineEditCommit<string>>(), commit = vi.fn();
    let signal!: AbortSignal;
    const save: InlineEditProps<string>['onSave'] = (_, context) => {signal = context.signal; return work.promise;};
    const view = render(<InlineEdit {...base} onSave={save} onCommit={commit}/>);
    await user.click(screen.getByRole('button', {name: 'Chỉnh sửa Tên'}));
    await user.click(screen.getByRole('button', {name: 'Lưu'}));
    view.rerender(<InlineEdit {...base} {...(change === 'value' ? {value: 'Remote'} : {scopeKey: 'other'})} onSave={save} onCommit={commit}/>);
    expect(signal.aborted).toBe(true);
    await act(async () => {work.reject(new Error('Late failure')); await Promise.resolve();});
    expect(commit).not.toHaveBeenCalled();
    expect(screen.getByRole('status', {name: 'Conflict'}).textContent).toBe('true');
  });

  it('acknowledgement uses consumer equality for independently allocated values', async () => {
    const user = userEvent.setup();
    const shared = {label: 'Name', scopeKey: 'one', isEqual: (a: {name: string}, b: {name: string}) => a.name === b.name,
      renderEditor: () => <input aria-label="Object draft"/>, onSave: async () => ({value: {name: 'New'}, revision: 2}), onCommit: vi.fn()};
    const view = render(<InlineEdit {...shared} value={{name: 'Old'}} revision={1} display="Old"/>);
    await user.click(screen.getByRole('button', {name: 'Chỉnh sửa Name'}));
    await user.click(screen.getByRole('button', {name: 'Lưu'}));
    expect(screen.getByRole('textbox')).toBeTruthy();
    view.rerender(<InlineEdit {...shared} value={{name: 'New'}} revision={2} display="New"/>);
    await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
  });

  it('an unrelated acknowledgement becomes a conflict and explicit reload uses current authority', async () => {
    const user = userEvent.setup();
    const view = render(<InlineEdit {...base}/>);
    await user.click(screen.getByRole('button', {name: 'Chỉnh sửa Tên'}));
    await user.click(screen.getByRole('button', {name: 'Lưu'}));
    view.rerender(<InlineEdit {...base} value="Remote" revision={9}/>);
    expect(screen.getByRole('status', {name: 'Conflict'}).textContent).toBe('true');
    await user.click(screen.getByRole('button', {name: 'Reload'}));
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Remote');
    expect(screen.getByRole('status', {name: 'Conflict'}).textContent).toBe('false');
  });
});

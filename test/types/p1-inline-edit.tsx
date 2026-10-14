import { InlineEdit } from '@sdcorejs/nova/inline-edit';

<InlineEdit value={{name: 'A'}} display="A" label="Name" revision={1} scopeKey="one" isEqual={(a, b) => a.name === b.name}
  renderEditor={({draft, setDraft}) => <input value={draft.name} onChange={event => setDraft({name: event.target.value})}/>}
  onSave={async (value, context) => ({value, revision: Number(context.baseRevision) + 1})} onCommit={() => {}}/>;
// @ts-expect-error a persisted commit must include its revision
<InlineEdit value="A" display="A" label="Name" revision={1} scopeKey="one" renderEditor={() => null} onSave={async value => ({value})} onCommit={() => {}}/>;

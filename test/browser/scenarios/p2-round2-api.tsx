import { useState } from 'react';
import { NovaProvider } from '../../../src/providers/nova/index.js';
import { ActionMenu } from '../../../src/components/action-menu/index.js';
import { TablePagination, type PageState } from '../../../src/components/data-table/index.js';
import { Dialog, Sheet } from '../../../src/components/dialog/index.js';
import { ReadOnlyValue } from '../../../src/components/read-only-value/index.js';

// Round-2 owner decisions: Dialog size/footer (Q4), danger menu tone (Q6),
// pagination size/first/last (Q1–Q3) and the empty read-only value (Q20).
type Size = 'sm' | 'md' | 'lg' | 480 | '640px';
export default function RoundTwoApi() {
  const [size, setSize] = useState<Size | undefined>(undefined), [open, setOpen] = useState(false), [sheet, setSheet] = useState(false);
  const [page, setPage] = useState<PageState>({ pageIndex: 2, pageSize: 20 }), [deleted, setDeleted] = useState(0);
  return <NovaProvider locale="en">
    {(['sm', 'md', 'lg', 480, '640px'] as const).map(value => <button key={value} onClick={() => { setSize(value); setOpen(true); }}>Open {value}</button>)}
    <button onClick={() => { setSize(undefined); setOpen(true); }}>Open default</button>
    <button onClick={() => setSheet(true)}>Open sheet</button>
    <Dialog title="Contract" size={size} value={open} onValueChange={setOpen} footer={<><button onClick={() => setOpen(false)}>Cancel contract</button><button>Save contract</button></>}>
      {Array.from({ length: 40 }, (_, index) => <p key={index}>Clause {index + 1}</p>)}
    </Dialog>
    <Sheet title="Filters" value={sheet} onValueChange={setSheet} footer={<button onClick={() => setSheet(false)}>Apply filters</button>}>
      {Array.from({ length: 40 }, (_, index) => <p key={index}>Filter {index + 1}</p>)}
    </Sheet>
    <ActionMenu data={1} label="Contract actions" actions={[{ id: 'open', label: 'Open contract', onAction: () => {} }, { id: 'delete', label: 'Delete contract', tone: 'danger', onAction: () => { setDeleted(count => count + 1); } }]} />
    <output aria-label="Deleted">{deleted}</output>
    <ReadOnlyValue data-testid="empty-value" label="Manager" value={null} display={null} />
    <TablePagination page={page} onPageChange={setPage} total={95} showFirstLast />
    <output aria-label="Page state">{JSON.stringify(page)}</output>
  </NovaProvider>;
}

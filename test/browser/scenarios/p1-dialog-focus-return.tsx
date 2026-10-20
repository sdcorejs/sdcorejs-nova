import { useRef, useState } from 'react';
import { NovaProvider } from '../../../src/providers/nova/index.js';
import { Sheet } from '../../../src/components/dialog/index.js';
// A long exit transition keeps each closed sheet mounted, like a sliding sheet,
// so a test can move focus outside before the popup unmounts.
export default function DialogFocusReturnScenario(){
  const [filters,setFilters]=useState(false),[sort,setSort]=useState(false),filtersTrigger=useRef<HTMLButtonElement>(null);
  return <NovaProvider locale="en"><style>{'.slow-exit{transition:opacity .8s linear}.slow-exit[data-ending-style]{opacity:0}'}</style>
    <button ref={filtersTrigger} onClick={()=>setFilters(true)}>Filters</button><button onClick={()=>setSort(true)}>Sort</button><button>Next chip</button>
    <Sheet title="Filter sheet" className="slow-exit" value={filters} onValueChange={setFilters} returnFocusRef={filtersTrigger}><input aria-label="Draft"/></Sheet>
    <Sheet title="Sort sheet" className="slow-exit" value={sort} onValueChange={setSort}><input aria-label="Draft"/></Sheet>
  </NovaProvider>;
}

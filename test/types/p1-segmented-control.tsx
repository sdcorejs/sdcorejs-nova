import { createRef } from 'react';
import { SegmentedControl, type SegmentOption, type SegmentValue } from '@sdcorejs/nova/segmented-control';
const items:readonly SegmentOption<SegmentValue>[]=[{value:false,label:'False'},{value:0,label:'Zero'}];
<SegmentedControl label="Mode" items={items} value={false} onValueChange={value=>{const typed:SegmentValue|null=value;void typed;}} ref={createRef<HTMLButtonElement>()} form="edit"/>;
<SegmentedControl label="Modes" items={items} multiple value={[false]} onValueChange={values=>{const typed:readonly SegmentValue[]=values;void typed;}}/>;
// @ts-expect-error accessible name is required
<SegmentedControl items={items} value={false} onValueChange={()=>{}}/>;
// @ts-expect-error controlled collection requires callback
<SegmentedControl label="Mode" items={items} value={false}/>;
// @ts-expect-error collection is controlled only
<SegmentedControl label="Mode" items={items} defaultValue={false} onValueChange={()=>{}}/>;
// @ts-expect-error multi values require an array
<SegmentedControl label="Modes" items={items} multiple value={false} onValueChange={()=>{}}/>;
// @ts-expect-error multi choices do not expose scalar clear behavior
<SegmentedControl label="Modes" items={items} multiple value={[]} onValueChange={()=>{}} allowEmpty/>;
// @ts-expect-error field owns its description
<SegmentedControl nameFromField description="duplicate" items={items} value={false} onValueChange={()=>{}}/>;
// @ts-expect-error semantic ref is a button rather than a wrapper
<SegmentedControl label="Mode" items={items} value={false} onValueChange={()=>{}} ref={createRef<HTMLDivElement>()}/>;

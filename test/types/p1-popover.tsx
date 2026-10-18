// Public consumer contracts; packed resolution follows the build prerequisite.
import { createRef } from 'react';
import { Popover, Tooltip } from '@sdcorejs/nova/popover';
const focus=createRef<HTMLInputElement>();
const controlled=<Popover label="Details" value={true} onValueChange={next=>{const open:boolean=next;void open;}} trigger={<button>More</button>} initialFocusRef={focus} placement="start">Content</Popover>;
const tip=<Tooltip content="Extra help"><button aria-label="Copy">Copy</button></Tooltip>;
void [controlled,tip];
// @ts-expect-error controlled values require a consumer callback
<Popover label="Details" value={true} trigger={<button>More</button>}>Content</Popover>;
// @ts-expect-error controlled and uncontrolled values are exclusive
<Popover label="Details" value={true} defaultValue={false} onValueChange={()=>{}} trigger={<button>More</button>}>Content</Popover>;
// @ts-expect-error trigger must be one composed element
<Popover label="Details" trigger="More">Content</Popover>;
// @ts-expect-error popover needs an accessible content name
<Popover trigger={<button>More</button>}>Content</Popover>;
// @ts-expect-error tooltip content is noninteractive text
<Tooltip content={<button>Action</button>}><button>Help</button></Tooltip>;
// @ts-expect-error tooltip trigger must be one element
<Tooltip content="Help">Help</Tooltip>;

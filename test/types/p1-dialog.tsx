// Public consumer contracts; packed resolution follows the build prerequisite.
import { createRef } from 'react';
import { Dialog, Drawer, Sheet, type CloseReason } from '@sdcorejs/nova/dialog';
const focus=createRef<HTMLInputElement>();
const controlled=<Dialog title="Rename" value={true} onValueChange={next=>{const open:boolean=next;void open;}} initialFocusRef={focus} onCloseRequest={reason=>{const close:CloseReason=reason;return close !== 'escape';}}>Form</Dialog>;
const sheet=<Sheet title="Options" defaultValue={true} side="start" size="sm">Options</Sheet>;
const drawer=<Drawer title="Options" modal={false} returnFocusRef={focus}>Options</Drawer>;
void [controlled,sheet,drawer];
// @ts-expect-error controlled values require a consumer callback
<Dialog title="Rename" value={true}>Form</Dialog>;
// @ts-expect-error controlled and uncontrolled values are exclusive
<Dialog title="Rename" value={true} defaultValue={true} onValueChange={()=>{}}>Form</Dialog>;
// @ts-expect-error values are boolean
<Dialog title="Rename" defaultValue="yes">Form</Dialog>;
// @ts-expect-error title is required for an accessible dialog name
<Dialog>Form</Dialog>;
// @ts-expect-error logical sides are start/end/bottom
<Sheet title="Options" side="left">Options</Sheet>;
// @ts-expect-error a close veto is synchronous, not an async action
<Dialog title="Rename" onCloseRequest={async()=>false}>Form</Dialog>;
// Round-2 owner decision Q4: named or custom px width and a sticky footer.
const sized=[<Dialog key="sm" title="Contract" size="sm" footer={<button>Save</button>}>Form</Dialog>,<Dialog key="lg" title="Contract" size="lg">Form</Dialog>,<Dialog key="n" title="Contract" size={480}>Form</Dialog>,<Dialog key="px" title="Contract" size="480px">Form</Dialog>,<Sheet key="sheet" title="Options" size="md" footer="Apply">Options</Sheet>];
void sized;
// @ts-expect-error custom sizes are px strings or numbers
<Dialog title="Contract" size="30rem">Form</Dialog>;
// @ts-expect-error unknown named size
<Dialog title="Contract" size="xl">Form</Dialog>;
// @ts-expect-error sheets keep named sizes only
<Sheet title="Options" size={480}>Options</Sheet>;

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

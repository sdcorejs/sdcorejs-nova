import { CopyButton } from '@sdcorejs/nova/copy-button';
import { ScrollArea } from '@sdcorejs/nova/scroll-area';
import { useClipboard } from '@sdcorejs/nova/clipboard';
function View(){const {copy,pending,errorMessage}=useClipboard();const result:Promise<boolean>=copy('text');void result;const busy:boolean=pending;const message:string|undefined=errorMessage;void busy;void message;return <><CopyButton text="text"/><ScrollArea maxHeight="12rem">Body</ScrollArea></>;}
void View;
// @ts-expect-error copy payload remains a string
<CopyButton text={2}/>;
// @ts-expect-error required copy text cannot be omitted
<CopyButton/>;
// @ts-expect-error caller owns a CSS string, not a pixel number
<ScrollArea maxHeight={120}>Body</ScrollArea>;
// @ts-expect-error scroll content is required
<ScrollArea/>;
// @ts-expect-error consumer action callback is not a CopyButton API
<CopyButton text="value" onClick={()=>{}}/>;

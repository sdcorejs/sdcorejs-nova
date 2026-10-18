// Public consumer declarations; packaged resolution is verified after the build.
import { Accordion, AccordionItem, CollapsibleSection } from '@sdcorejs/nova/accordion';

const single=<Accordion value={['a']} onValueChange={next=>{const keys:readonly string[]=next;void keys;}}><AccordionItem value="a" title="A" headingLevel={2}>Panel</AccordionItem></Accordion>;
const section=<CollapsibleSection defaultValue={false} title="Details" data-testid="details" onValueChange={next=>{const open:boolean=next;void open;}}>Panel</CollapsibleSection>;
void [single,section];
// @ts-expect-error controlled sections require a consumer callback
<CollapsibleSection value={true} title="Details">Panel</CollapsibleSection>;
// @ts-expect-error controlled and uncontrolled values are exclusive
<CollapsibleSection value={true} defaultValue={false} onValueChange={()=>{}} title="Details">Panel</CollapsibleSection>;
// @ts-expect-error only semantic heading levels 2 through 6 are accepted
<CollapsibleSection title="Details" headingLevel={1}>Panel</CollapsibleSection>;
// @ts-expect-error controlled collections require a consumer callback
<Accordion value={['a']}><AccordionItem value="a" title="A">Panel</AccordionItem></Accordion>;
// @ts-expect-error collection keys are strings
<Accordion defaultValue={[1]}>Panel</Accordion>;
// @ts-expect-error item identities are stable string keys
<AccordionItem value={false} title="A">Panel</AccordionItem>;

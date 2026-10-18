import { createRef } from 'react';
import { AnchorNavigation, AnchorSection } from '@sdcorejs/nova/anchor-navigation';
const items=[{id:'one',title:'One'}];
<AnchorNavigation items={items} label="Contents" activeId={null} onActiveIdChange={id=>{const typed:string|null=id;void typed;}} scrollRootRef={createRef<HTMLDivElement>()}/>;
<AnchorNavigation items={items} label="Contents" defaultActiveId="one" updateHash/>;
<AnchorSection id="one" title="First" headingLevel={3}>Body</AnchorSection>;
// @ts-expect-error navigation requires an accessible name
<AnchorNavigation items={items}/>;
// @ts-expect-error controlled active location requires callback
<AnchorNavigation items={items} label="Contents" activeId="one"/>;
// @ts-expect-error controlled and uncontrolled state are exclusive
<AnchorNavigation items={items} label="Contents" activeId="one" defaultActiveId="one" onActiveIdChange={()=>{}}/>;
// @ts-expect-error section heading level is bounded
<AnchorSection id="one" title="First" headingLevel={1}>Body</AnchorSection>;
// @ts-expect-error section identity is required
<AnchorSection title="First">Body</AnchorSection>;

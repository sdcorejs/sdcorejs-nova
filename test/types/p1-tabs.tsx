import { Tabs, TabList, Tab, TabPanel } from '@sdcorejs/nova/tabs';
const parts=<><TabList label="Views"><Tab value="one">One</Tab></TabList><TabPanel value="one" keepMounted>Content</TabPanel></>;
const controlled=<Tabs value="one" onValueChange={next=>{const selected:string=next;void selected;}} activationMode="manual">{parts}</Tabs>;
const uncontrolled=<Tabs defaultValue="one" orientation="vertical">{parts}</Tabs>;void [controlled,uncontrolled];
// @ts-expect-error controlled values require a callback
<Tabs value="one">{parts}</Tabs>;
// @ts-expect-error controlled and uncontrolled values are exclusive
<Tabs value="one" defaultValue="one" onValueChange={()=>{}}>{parts}</Tabs>;
// @ts-expect-error tab identity is a string rather than an array index
<Tab value={1}>One</Tab>;
// @ts-expect-error tablist requires an accessible name
<TabList><Tab value="one">One</Tab></TabList>;
// @ts-expect-error activation mode is explicit and bounded
<Tabs activationMode="hover">{parts}</Tabs>;
// @ts-expect-error panel ownership requires a value
<TabPanel>Content</TabPanel>;

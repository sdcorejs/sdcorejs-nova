import { AppShell, Navigation, Sidebar, type NavItem } from '@sdcorejs/nova/app-shell';

<AppShell header="Account" sidebar={<Sidebar label="Workspace" defaultValue><Navigation label="Main" items={[]}/></Sidebar>}>Page</AppShell>;
<Sidebar label="Workspace" value={true} onValueChange={() => {}} mobileValue={false} onMobileValueChange={() => {}}>Links</Sidebar>;
// @ts-expect-error controlled mobile state requires its own callback
<Sidebar label="Workspace" mobileValue={false}>Links</Sidebar>;
// @ts-expect-error controlled desktop state requires callback
<Sidebar label="Workspace" value={true}>Links</Sidebar>;
// @ts-expect-error a child cannot itself be a group
const deep: NavItem = {id: 'a', label: 'A', children: [{id: 'b', label: 'B', children: []}]};
void deep;

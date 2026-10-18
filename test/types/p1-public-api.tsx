import * as Nova from '@sdcorejs/nova';
import {Calendar,DatePicker,TimeInput,AppShell,Navigation,Sidebar,UnsavedChangesProvider,InlineEdit,useFormValidation} from '@sdcorejs/nova';
void [Calendar,DatePicker,TimeInput,AppShell,Navigation,Sidebar,UnsavedChangesProvider,InlineEdit,useFormValidation];
export function RootAdapterIsolationFixture(){
// @ts-expect-error optional adapters are isolated to their public subpaths
Nova.createTemporalAdapter();
// @ts-expect-error optional adapters do not leak into the root declaration graph
Nova.useNovaController({name:'x'});

return null;
}

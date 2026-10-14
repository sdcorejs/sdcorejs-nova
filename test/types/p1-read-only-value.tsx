import {ReadOnlyValue,View} from '@sdcorejs/nova/read-only-value';
<View label="Name" value={{name:'An'}} display="An" renderValue={raw=>raw.name}/>;
<ReadOnlyValue value={false} display={false}/>;
// @ts-expect-error explicit display is required instead of object stringification
<ReadOnlyValue value={{name:'An'}}/>;

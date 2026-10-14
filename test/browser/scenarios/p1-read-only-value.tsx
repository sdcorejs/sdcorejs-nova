import {ReadOnlyValue,View} from '../../../src/components/read-only-value/index.js';
export default function Values(){return <><View label="Zero" value={0} display={0}/><ReadOnlyValue value={false} display={false} label="Boolean"/><ReadOnlyValue value={{id:1}} display="Raw" renderValue={raw=>String(raw.id)} href="javascript:alert(1)"/><ReadOnlyValue value={null} display={null}/></>;}

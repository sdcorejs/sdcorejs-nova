import {useState} from 'react';import {ConfirmProvider,useConfirm} from '../../../src/providers/confirm/index.js';import {NovaProvider} from '../../../src/providers/nova/index.js';
function Content(){const confirm=useConfirm(),[result,set]=useState('');return <><button onClick={()=>{void confirm({title:'Delete draft?',tone:'danger'}).then(set);}}>Open confirm</button><output aria-label="Result">{result}</output></>;}
export default function Confirm(){return <NovaProvider locale="en"><ConfirmProvider><Content/></ConfirmProvider></NovaProvider>;}

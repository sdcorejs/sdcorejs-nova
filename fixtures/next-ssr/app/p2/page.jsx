import {NovaProvider} from '@sdcorejs/nova';
import {serializeQuery} from '@sdcorejs/nova/query';
import {ClientDemo} from './client-demo.jsx';
export const dynamic='force-dynamic';
export default function P2Page(){const query=serializeQuery({kind:'rule',id:'server-ui',field:'enabled',operator:'eq',operand:{kind:'literal',value:false}});return <NovaProvider locale="en"><main className="fixture-surface"><h1>P2 packed server consumer</h1><output data-testid="p2-server-query">{JSON.stringify(query)}</output><ClientDemo/></main></NovaProvider>;}

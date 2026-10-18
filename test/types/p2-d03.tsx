// case-p2-d03-ac01-types: public fixtures; runtime source projection is supplemental.
import {QueryBuilder,type QueryBuilderProps,type QueryNode} from '@sdcorejs/nova/query-builder';import {QueryBuilder as RootQueryBuilder,serializeQuery as rootSerializeQuery} from '@sdcorejs/nova';import {serializeQuery,type FilterField} from '@sdcorejs/nova/query';
const fields:readonly FilterField[]=[{id:'n',label:'Count',kind:'number',operators:['eq'],comparisonGroup:'amount'}];const node:QueryNode={kind:'rule',id:'r',field:'n',operator:'eq',operand:{kind:'literal',value:[0,'0']}};<QueryBuilder fields={fields} value={node} onValueChange={()=>{}} maxDepth={8} maxRules={100} allowFieldCompare readOnly/>;<QueryBuilder fields={fields} defaultValue={null}/>;<RootQueryBuilder fields={fields} value={null} onValueChange={()=>{}}/>;serializeQuery(node);rootSerializeQuery(null);const props:QueryBuilderProps={fields,defaultValue:node};void props;
// @ts-expect-error controlled callback required
<QueryBuilder fields={fields} value={node}/>;
// @ts-expect-error mixed control modes rejected
<QueryBuilder fields={fields} value={null} defaultValue={node} onValueChange={()=>{}}/>;
// @ts-expect-error disabled is not part of the approved D03 API
<QueryBuilder fields={fields} disabled/>;
// @ts-expect-error Apply is local UI activation, not a new callback prop
<QueryBuilder fields={fields} onApply={()=>{}}/>;
// @ts-expect-error serializer has exactly one argument, no hidden UI options
serializeQuery(node,{maxDepth:4});
// @ts-expect-error literal objects are not FilterValue
const invalid:QueryNode={kind:'rule',id:'r',field:'n',operator:'eq',operand:{kind:'literal',value:{sql:'select'}}};void invalid;
// @ts-expect-error logic union closed
const logic:QueryNode={kind:'group',id:'g',logic:'xor',children:[]};void logic;
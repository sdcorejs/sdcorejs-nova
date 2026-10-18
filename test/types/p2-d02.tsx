import {QueryBar,FilterPanel,type FilterField,type FilterRule,type FilterValue,type QueryBarProps} from '@sdcorejs/nova/query-bar';
import {QueryBar as RootQueryBar,FilterPanel as RootFilterPanel} from '@sdcorejs/nova';
const fields:readonly FilterField[]=[{id:'count',label:'Count',kind:'number',operators:['eq'],comparisonGroup:'amount'}];const rules:readonly FilterRule[]=[{fieldId:'count',operator:'eq',value:0}];const choices:FilterValue=[0,'0'];void choices;
<QueryBar fields={fields} value={rules} onValueChange={()=>{}} onApply={async()=>{}}/>;<RootQueryBar fields={fields} value={rules} onValueChange={()=>{}}/>;<FilterPanel open={false} onOpenChange={()=>{}}><p>Filters</p></FilterPanel>;<RootFilterPanel open={false} onOpenChange={()=>{}}>Content</RootFilterPanel>;
// @ts-expect-error applied business state is always controlled
<QueryBar fields={fields} defaultValue={rules} onValueChange={()=>{}}/>;
// @ts-expect-error controlled callback is mandatory
<QueryBar fields={fields} value={rules}/>;
// @ts-expect-error arbitrary objects are not literals
const invalid:FilterValue={query:'raw'};void invalid;
// @ts-expect-error metadata kind is closed
const invalidField:FilterField={id:'x',label:'X',kind:'sql',operators:['eq']};void invalidField;
const props:QueryBarProps={fields,value:rules,onValueChange:()=>{}};void props;

import {createRef,type Ref} from 'react';
import type {FilterPanelProps} from '@sdcorejs/nova/query-bar';
const panelRef=createRef<HTMLDivElement>(),panelLegacy:Ref<HTMLDivElement>=node=>{const div:HTMLDivElement|null=node;void div;},panelCleanup:Ref<HTMLDivElement>=node=>{if(node)return()=>{void node;};};
const panelProps:FilterPanelProps={open:true,onOpenChange:()=>{},children:'Filters',ref:panelRef};
const panelConsumers=<><FilterPanel {...panelProps}/><RootFilterPanel open onOpenChange={()=>{}} ref={panelLegacy}>Filters</RootFilterPanel><FilterPanel open onOpenChange={()=>{}} ref={panelCleanup}>Filters</FilterPanel></>;
// @ts-expect-error FilterPanel popup is a div, not SVG
const wrongPanelRef=<FilterPanel open onOpenChange={()=>{}} ref={createRef<SVGSVGElement>()}>Filters</FilterPanel>;
void [panelConsumers,wrongPanelRef];

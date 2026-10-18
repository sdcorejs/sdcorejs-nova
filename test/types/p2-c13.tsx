// case-p2-c13-ac01-types; packed/public root and subpath proof belongs to parent integration.
import {Splitter,type SplitterProps} from '@sdcorejs/nova/splitter';
import {ResizableDialog,type DialogSize,type ResizableDialogProps} from '@sdcorejs/nova/resizable-dialog';
import {Splitter as RootSplitter,ResizableDialog as RootDialog} from '@sdcorejs/nova';
const sizes:readonly number[]=[35,65];const size:DialogSize={width:400,height:300};
const splitter:SplitterProps={value:sizes,onValueChange:next=>{const raw:readonly number[]=next;void raw;},disabled:true,orientation:'vertical',minSizes:[20,20],children:'panel'};
const dialog:ResizableDialogProps={value:true,onValueChange:next=>{const raw:boolean=next;void raw;},title:'Tools',children:'form',size,onSizeChange:next=>{const raw:DialogSize=next;void raw;},disabled:true};
const valid=<><Splitter {...splitter}/><RootSplitter defaultValue={sizes}>Panel</RootSplitter><ResizableDialog {...dialog}/><RootDialog title="Tools" defaultValue>Content</RootDialog></>;
// @ts-expect-error value/defaultValue are exclusive
const both=<Splitter value={sizes} defaultValue={sizes} onValueChange={()=>{}}>Panel</Splitter>;
// @ts-expect-error controlled percent array requires proposal callback
const noCallback=<Splitter value={sizes}>Panel</Splitter>;
// @ts-expect-error percent geometry is numeric, never arbitrary CSS
const cssPercent=<Splitter defaultValue={['25%','75%']}>Panel</Splitter>;
// @ts-expect-error dialog preserves boolean open state
const badOpen=<ResizableDialog title="Tools" value={size} onValueChange={()=>{}}>Content</ResizableDialog>;
// @ts-expect-error dialog size accepts finite numeric API, not CSS strings
const cssSize=<ResizableDialog title="Tools" size={{width:'calc(10px)',height:300}}>Content</ResizableDialog>;
// @ts-expect-error inherited controlled Dialog value requires callback
const badDialog=<ResizableDialog title="Tools" value>Content</ResizableDialog>;
// @ts-expect-error dialog title remains required
const noTitle=<ResizableDialog>Content</ResizableDialog>;
void [valid,both,noCallback,cssPercent,badOpen,cssSize,badDialog,noTitle];

import {createRef,type Ref} from 'react';
const rootRef=createRef<HTMLDivElement>();
const legacyRootRef:Ref<HTMLDivElement>=node=>{const root:HTMLDivElement|null=node;void root;};
const cleanupRootRef:Ref<HTMLDivElement>=node=>{if(node){const root:HTMLDivElement=node;return()=>{void root;};}};
const rootRefProps:SplitterProps={ref:rootRef,children:'panel'};
const rootRefConsumers=<><Splitter {...rootRefProps}/><RootSplitter ref={rootRef}>Panel</RootSplitter><Splitter ref={legacyRootRef}>Panel</Splitter><RootSplitter ref={cleanupRootRef}>Panel</RootSplitter></>;
// @ts-expect-error Splitter root is a div, not an SVG element
const wrongRootRef=<Splitter ref={createRef<SVGSVGElement>()}>Panel</Splitter>;
void [rootRefConsumers,wrongRootRef];

import {Dialog,Sheet,Drawer,type DialogProps} from '@sdcorejs/nova/dialog';
const popupProps:DialogProps={title:'Popup',children:'body',ref:rootRef};
const resizablePopupProps:ResizableDialogProps={title:'Resize',children:'body',ref:rootRef};
const popupConsumers=<><Dialog {...popupProps}/><Sheet title="Sheet" ref={legacyRootRef}>Body</Sheet><Drawer title="Drawer" ref={cleanupRootRef}>Body</Drawer><ResizableDialog {...resizablePopupProps}/><RootDialog title="Root resize" ref={cleanupRootRef}>Body</RootDialog></>;
// @ts-expect-error popup is a div, not SVG
const wrongPopupRef=<ResizableDialog title="Wrong" ref={createRef<SVGSVGElement>()}>Body</ResizableDialog>;
// @ts-expect-error Dialog popup is a div, not SVG
const wrongDialogPopupRef=<Dialog title="Wrong" ref={createRef<SVGSVGElement>()}>Body</Dialog>;
void [popupConsumers,wrongPopupRef,wrongDialogPopupRef];

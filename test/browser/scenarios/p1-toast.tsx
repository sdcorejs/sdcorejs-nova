import {ToastProvider,useToast} from '../../../src/providers/toast/index.js';import {NovaProvider} from '../../../src/providers/nova/index.js';
function Content(){const toast=useToast();return <><button onClick={()=>toast.show({id:'saved',title:'Saved successfully',tone:'success',durationMs:null})}>Show toast</button><button onClick={()=>toast.update('saved',{title:'Updated successfully'})}>Update toast</button></>;}
export default function Toast(){return <NovaProvider locale="en"><ToastProvider maxVisible={1}><Content/></ToastProvider></NovaProvider>;}

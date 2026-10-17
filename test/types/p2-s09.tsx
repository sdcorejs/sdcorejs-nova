// case-p2-s09-ac01-types — public resolution is verified by parent integration.
import {useStoredState,type StorageAdapter,type StoredStateOptions} from '@sdcorejs/nova/stored-state';
import {createLocalStorageAdapter} from '@sdcorejs/nova/adapters/storage';
import {useStoredState as rootStoredState} from '@sdcorejs/nova';
type Preference={readonly key:0|'zero';readonly enabled:false;readonly values:readonly number[]};
const adapter:StorageAdapter=createLocalStorageAdapter();
const options:StoredStateOptions<Preference>={key:'preferences',scopeKey:'nonsecret-owner',version:1,initial:{key:0,enabled:false,values:[]},adapter,encode:JSON.stringify,decode:JSON.parse,migrate:(_payload,oldVersion)=>({key:oldVersion===0?0:'zero',enabled:false,values:[]})};
function Consumer(){const state=useStoredState<Preference>(options);const root=rootStoredState<Preference>(options);const value:Preference=state.value;const status:'loading'|'ready'|'error'=state.status;state.setValue(value);const reset:Promise<void>=state.reset();
 // @ts-expect-error raw typed value cannot be a serialized string
 state.setValue('serialized');
 // @ts-expect-error literal false is preserved
 state.setValue({key:0,enabled:true,values:[]});
 // @ts-expect-error migration receives a numeric old version
 const migrate:StoredStateOptions<Preference>['migrate']=(_payload:string,_version:string)=>{void [_payload,_version];return value;};
 void [root,status,reset,migrate];return null;
}
// @ts-expect-error scope is required and consumer-owned
const missing:StoredStateOptions<string>={key:'x',version:1,initial:'',adapter,encode:String,decode:String};
// @ts-expect-error payload encoding must return a string
const invalid:StoredStateOptions<number>={key:'x',scopeKey:'s',version:1,initial:0,adapter,encode:value=>value,decode:Number};
void [Consumer,missing,invalid];

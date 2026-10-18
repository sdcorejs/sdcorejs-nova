import {renderToString} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {useStoredState,type StorageAdapter} from '../../src/hooks/stored-state/index.js';
import {createLocalStorageAdapter} from '../../src/adapters/storage/index.js';
it('case-p2-s09-ac01-ssr deterministic initial value/status and no transport or browser access during server rendering',()=>{
 const adapter:StorageAdapter={read:vi.fn(async()=>null),write:vi.fn(async()=>{}),remove:vi.fn(async()=>{})};
 function Consumer(){const state=useStoredState({key:'preferences',scopeKey:'request',version:1,initial:0,adapter,encode:String,decode:Number});return <output>{state.value}:{state.status}</output>;}
 expect(renderToString(<Consumer/>)).toBe('<output>0<!-- -->:<!-- -->loading</output>');expect(renderToString(<Consumer/>)).toBe(renderToString(<Consumer/>));expect(adapter.read).not.toHaveBeenCalled();expect(adapter.write).not.toHaveBeenCalled();expect(adapter.remove).not.toHaveBeenCalled();expect(typeof window).toBe('undefined');expect(()=>createLocalStorageAdapter()).not.toThrow();
});
it('source isolation: hook has no browser storage, optional engine or adapter import; browser factory only refers to window inside methods',()=>{
 const hook=readFileSync('src/hooks/stored-state/stored-state.ts','utf8');expect(hook).not.toMatch(/\b(?:window|document|localStorage|sessionStorage)\b/);expect(hook).not.toMatch(/from ['"][^'"]*(?:adapters|xlsx|pdfjs|monaco|temporal|react-hook-form)/);const adapter=readFileSync('src/adapters/storage/storage.ts','utf8');expect(adapter).toMatch(/import type/);expect(adapter).not.toMatch(/from ['"](?:react|react-dom|@base-ui)/);
});

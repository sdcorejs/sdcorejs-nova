import {describe,it,expect} from 'vitest';
import {createTemporalAdapter} from './temporal-adapter.js';
const adapter=createTemporalAdapter();const resolve=(date:string,time:string,timeZone='America/New_York',disambiguation:'reject'|'earlier'|'later'='reject')=>adapter.resolve({date,time,timeZone,disambiguation});
describe('explicit Temporal converter',()=>{
 it('resolves normal wall time to a UTC instant',()=>expect(resolve('2024-01-15','09:30')).toEqual({status:'resolved',instant:'2024-01-15T14:30:00Z'}));
 it.each(['reject','earlier','later'] as const)('never silently shifts a DST gap (%s)',choice=>expect(resolve('2024-03-10','02:30','America/New_York',choice)).toEqual({status:'invalid',reason:'gap'}));
 it('rejects overlap unless the caller explicitly chooses an occurrence',()=>{expect(resolve('2024-11-03','01:30')).toEqual({status:'invalid',reason:'ambiguous'});expect(resolve('2024-11-03','01:30','America/New_York','earlier')).toEqual({status:'resolved',instant:'2024-11-03T05:30:00Z'});expect(resolve('2024-11-03','01:30','America/New_York','later')).toEqual({status:'resolved',instant:'2024-11-03T06:30:00Z'});});
 it('rejects invalid date, time and zone distinctly',()=>{expect(resolve('2023-02-29','10:00').status).toBe('invalid');expect(resolve('2024-01-15','24:00')).toEqual({status:'invalid',reason:'invalid-time'});expect(resolve('2024-01-15','10:00','Invalid/Zone')).toEqual({status:'invalid',reason:'invalid-zone'});});
});

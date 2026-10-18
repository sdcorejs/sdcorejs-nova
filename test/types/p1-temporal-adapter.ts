import {createTemporalAdapter} from '@sdcorejs/nova/adapters/temporal';
import type {DateTimeAdapter,WallTimeResult} from '@sdcorejs/nova';
const adapter:DateTimeAdapter=createTemporalAdapter();const result:WallTimeResult=adapter.resolve({date:'2024-11-03',time:'01:30',timeZone:'America/New_York',disambiguation:'later'});void result;
// @ts-expect-error disambiguation is explicit
adapter.resolve({date:'2024-11-03',time:'01:30',timeZone:'UTC'});

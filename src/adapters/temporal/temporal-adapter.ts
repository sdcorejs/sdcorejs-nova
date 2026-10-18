import {Temporal} from '@js-temporal/polyfill';
import {parseISODate} from '../../lib/civil-date.js';
import type {DateTimeAdapter} from '../../types/index.js';
/** Reject DST gap shifting even when the caller disambiguates overlaps. */
export function createTemporalAdapter():DateTimeAdapter {
 return {resolve({date,time,timeZone,disambiguation}) {
  if(!parseISODate(date))return {status:'invalid',reason:'invalid-date'};
  if(!/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/u.test(time))return {status:'invalid',reason:'invalid-time'};
  try {
   const wall=Temporal.PlainDateTime.from(date+'T'+time);
   const early=wall.toZonedDateTime(timeZone,{disambiguation:'earlier'}),late=wall.toZonedDateTime(timeZone,{disambiguation:'later'});
   if(!early.toPlainDateTime().equals(wall)||!late.toPlainDateTime().equals(wall))return {status:'invalid',reason:'gap'};
   if(early.epochNanoseconds!==late.epochNanoseconds&&disambiguation==='reject')return {status:'invalid',reason:'ambiguous'};
   return {status:'resolved',instant:(disambiguation==='later'?late:early).toInstant().toString()};
  }catch{return {status:'invalid',reason:'invalid-zone'};}
 }};
}

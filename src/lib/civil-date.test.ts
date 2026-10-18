// @vitest-environment node
import {afterEach,describe,expect,it,vi} from 'vitest';
import {parseISODate,parseISOInstant,formatRelative} from './civil-date.js';
import {vi as vietnamese} from '../i18n/vi.js';
afterEach(()=>vi.restoreAllMocks());
describe('civil date and explicit instant boundaries',()=>{
 it.each(['0001-01-01','1900-02-28','2000-02-29','2024-02-29','9999-12-31'])('keeps valid civil day %s at UTC midnight',value=>{
  expect(parseISODate(value)?.toISOString()).toBe(value+'T00:00:00.000Z');
 });
 it.each(['0000-01-01','1900-02-29','2023-02-29','2024-02-30','2024-04-31','2024-00-01','2024-13-01','2024-01-00','2024-1-01',' 2024-01-01','2024-01-01T00:00:00Z'])('rejects invalid or noncanonical civil day %s',value=>{
  expect(parseISODate(value)).toBeNull();
 });
 it('never changes the civil day with host timezone or reads the current clock',()=>{
  const original=process.env.TZ;vi.spyOn(Date,'now').mockImplementation(()=>{throw Error('Host clock forbidden');});
  try{for(const zone of ['UTC','America/Los_Angeles','Asia/Ho_Chi_Minh']){process.env.TZ=zone;expect(parseISODate('2024-02-29')?.toISOString()).toBe('2024-02-29T00:00:00.000Z');}}
  finally{if(original===undefined)delete process.env.TZ;else process.env.TZ=original;}
 });
 it.each([
  ['2024-01-15T09:30:00-05:00','2024-01-15T14:30:00.000Z'],
  ['2024-01-15T21:30+07:00','2024-01-15T14:30:00.000Z'],
  ['2024-01-15T14:30:00.125Z','2024-01-15T14:30:00.125Z'],
 ])('normalizes explicit instant %s', (value,expected)=>{expect(parseISOInstant(value)?.toISOString()).toBe(expected);});
 it.each(['2024-01-15','2024-01-15T14:30:00','2024-02-30T14:30:00Z','2024-01-15T24:00:00Z','2024-01-15T14:60:00Z','2024-01-15T14:30:60Z','2024-01-15T14:30:00+24:00','not-a-date'])('rejects missing offset or impossible instant %s',value=>{
  expect(parseISOInstant(value)).toBeNull();
 });
 it('uses elapsed UTC hours through DST with explicit now instead of calendar arithmetic',()=>{
  expect(formatRelative('2024-03-10T12:00:00-04:00',{locale:'en',now:'2024-03-03T12:00:00-05:00',unit:'hour'})).toBe('in 167 hours');
 });
 it('treats equal instants with different offsets as now and localizes invalid input',()=>{
  expect(formatRelative('2024-01-15T21:30:00+07:00',{locale:'en',now:'2024-01-15T14:30:00Z'})).toBe('now');
  expect(formatRelative('invalid',{locale:'vi',now:'2024-01-15T14:30:00Z'})).toBe(vietnamese.feedback.unavailable);
 });
});

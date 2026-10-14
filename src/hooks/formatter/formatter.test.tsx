import { cleanup, act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NovaProvider } from '../../providers/nova/nova-provider.js';
import { formatRelative, useFormatter, useRelativeTime } from './index.js';

const instant = '2026-10-08T08:30:00Z';
function scope(locale: string, timeZone = 'UTC') {
  return function Wrapper({ children }: {children: ReactNode}) { return <NovaProvider locale={locale} timeZone={timeZone}>{children}</NovaProvider>; };
}
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('explicit formatter snapshots', () => {
  it('uses each provider locale for decimal 0 and finite values', () => {
    const en = renderHook(() => useFormatter(), {wrapper: scope('en')});
    const viHook = renderHook(() => useFormatter(), {wrapper: scope('vi')});
    expect(en.result.current.number(0)).toBe('0');
    expect(en.result.current.number(1234.5)).toBe(new Intl.NumberFormat('en').format(1234.5));
    expect(viHook.result.current.number(1234.5)).toBe(new Intl.NumberFormat('vi').format(1234.5));
  });
  it('does not expose invalid number or date input as locale keys', () => {
    const hook = renderHook(() => useFormatter(), {wrapper: scope('en')});
    for (const value of [NaN, Infinity, -Infinity]) expect(hook.result.current.number(value)).toBe('Unavailable');
    for (const value of ['2023-02-29', '2024-02-30', '0000-01-01', '10000-01-01', '2024-2-1']) expect(hook.result.current.date(value)).toBe('Unavailable');
  });
  it('civil date never changes with provider timezone, including leap day and years below 100', () => {
    const a = renderHook(() => useFormatter(), {wrapper: scope('en', 'America/Los_Angeles')});
    const b = renderHook(() => useFormatter(), {wrapper: scope('en', 'Asia/Ho_Chi_Minh')});
    for (const date of ['2024-02-29', '0001-01-01', '0099-12-31']) {
      const expected = new Intl.DateTimeFormat('en', {timeZone: 'UTC'}).format(new Date(date+'T00:00:00Z'));
      expect(a.result.current.date(date)).toBe(expected); expect(b.result.current.date(date)).toBe(expected);
    }
  });
  it('formats explicit offset instants in explicit zones and rejects offsetless or rollover dates', () => {
    const hook = renderHook(() => useFormatter({timeZone: 'America/New_York'}), {wrapper: scope('en')});
    expect(hook.result.current.instant('2026-10-08T10:30:00+02:00')).toBe(new Intl.DateTimeFormat('en', {timeZone: 'America/New_York'}).format(new Date(instant)));
    expect(hook.result.current.instant(instant, {hour: 'numeric', timeZone: 'Asia/Tokyo'})).toBe(new Intl.DateTimeFormat('en', {hour: 'numeric', timeZone: 'Asia/Tokyo'}).format(new Date(instant)));
    for (const value of ['2026-10-08T08:30:00', '2023-02-30T00:00:00Z', '2026-10-08T24:01:00Z']) expect(hook.result.current.instant(value)).toBe('Unavailable');
  });
  it('relative formatting takes explicit now and uses fixed elapsed units', () => {
    const value = '2026-10-08T08:29:00Z';
    expect(formatRelative(value, {locale: 'en', now: instant, unit: 'minute'})).toBe(new Intl.RelativeTimeFormat('en', {numeric: 'auto'}).format(-1, 'minute'));
    expect(formatRelative(value, {locale: 'vi', now: instant, unit: 'minute'})).toBe(new Intl.RelativeTimeFormat('vi', {numeric: 'auto'}).format(-1, 'minute'));
    expect(formatRelative(instant, {locale: 'en', now: instant, unit: 'day'})).toBe('today');
    expect(formatRelative(instant, {locale: 'en', now: 'invalid'})).toBe('Unavailable');
  });
  it('does not create a timer unless live is explicit; prop snapshots update without machine clock', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2030-01-01T00:00:00Z'));
    const hook = renderHook(({now}) => useRelativeTime(instant, {now, unit: 'minute'}), {wrapper: scope('en'), initialProps: {now: instant}});
    expect(hook.result.current).toBe('this minute'); expect(vi.getTimerCount()).toBe(0);
    hook.rerender({now:'2026-10-08T08:31:00Z'}); expect(hook.result.current).toBe('1 minute ago');
  });
  it('live opt-in advances after mount and disposes its timer on prop change/unmount', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(instant));
    const hook = renderHook(({live}) => useRelativeTime(instant, {now: instant, unit:'second', live, intervalMs:1000}), {wrapper:scope('en'),initialProps:{live:true}});
    expect(vi.getTimerCount()).toBe(1);
    act(() => { vi.advanceTimersByTime(1000); }); expect(hook.result.current).toBe('1 second ago');
    hook.rerender({live:false}); expect(vi.getTimerCount()).toBe(0); expect(hook.result.current).toBe('now');
    hook.rerender({live:true}); expect(vi.getTimerCount()).toBe(1);
    hook.unmount(); expect(vi.getTimerCount()).toBe(0);
  });
});

// Follow the actual named export instead of mistaking a barrel for a client boundary.
function serverExport(entry:string, symbol:string, seen=new Set<string>()):string|null {
  if(seen.has(entry))return null;seen.add(entry);
  const source=readFileSync(entry,'utf8');
  if(/^['"]use client['"];?/mu.test(source))return null;
  if(new RegExp('export\\s+(?:function|const)\\s+'+symbol+'\\b','u').test(source))return entry;
  for(const item of source.matchAll(/export\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/gu)) {
    if(!item[1]!.split(',').some(x=>x.trim()===symbol))continue;
    const prefix=path.resolve(path.dirname(entry),item[2]!.replace(/\.js$/u,''));
    const next=[prefix+'.ts',prefix+'.tsx'].find(x=>existsSync(x));
    if(next)return serverExport(next,symbol,seen);
  }
  return null;
}

describe('formatter server boundary and explicit timezone regressions',()=>{
  it('the public pure relative helper resolves to a server-callable implementation rather than a client hook leaf',()=>{
    const target=serverExport(path.resolve(import.meta.dirname,'index.ts'),'formatRelative');
    expect(target).not.toBeNull();
    expect(target && readFileSync(target,'utf8')).not.toMatch(/(?:from\s*['"]react['"]|['"]use client['"])/u);
  });
  it('an explicit undefined format timezone retains the provider or hook zone instead of the host zone',()=>{
    const date=new Date(instant),formatOptions:Intl.DateTimeFormatOptions={year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23',timeZone:undefined};
    const hostResult=new Intl.DateTimeFormat('en',formatOptions).format(date);
    const zone=['UTC','Pacific/Honolulu','Asia/Tokyo'].find(timeZone=>new Intl.DateTimeFormat('en',{...formatOptions,timeZone}).format(date)!==hostResult)!;
    expect(zone).toBeTruthy();const expected=new Intl.DateTimeFormat('en',{...formatOptions,timeZone:zone}).format(date);expect(expected).not.toBe(hostResult);
    const provider=renderHook(()=>useFormatter(),{wrapper:scope('en',zone)});
    const override=renderHook(()=>useFormatter({timeZone:zone}),{wrapper:scope('en','UTC')});
    expect(provider.result.current.instant(instant,formatOptions)).toBe(expected);
    expect(override.result.current.instant(instant,formatOptions)).toBe(expected);
  });
});

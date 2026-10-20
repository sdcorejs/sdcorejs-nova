'use client';
import {createContext,useContext,useId,useLayoutEffect,useRef,useState,type KeyboardEvent} from 'react';
import type {DateRange,ISODate,SurfaceProps} from '../../types/index.js';
import type {CalendarBase} from './date-picker.js';
import {en} from '../../i18n/en.js';
import {parseISODate} from '../../lib/civil-date.js';
import {cx} from '../../lib/cx.js';
import {Icon} from '../../lib/icons.js';
import {useNovaScope} from '../../providers/nova/context.js';
function iso(date: Date): ISODate {return date.toISOString().slice(0,10);}
function monthOf(date: ISODate) {return date.slice(0,7);}
function monthLength(year: number, month: number) {return [31,(year%4===0 && (year%100!==0 || year%400===0))?29:28,31,30,31,30,31,31,30,31,30,31][month-1]!;}
function shiftMonth(date: ISODate, delta: number): ISODate {
  const [y,m,d]=date.split('-').map(Number) as [number,number,number];
  const count=Math.max(12,Math.min(9999*12+11,y*12+m-1+delta)),year=Math.floor(count/12),month=count%12+1;
  return `${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(Math.min(d,monthLength(year,month))).padStart(2,'0')}`;
}
function shiftDay(date: ISODate, delta: number): ISODate {
  const next=new Date(parseISODate(date)!.getTime()+delta*86400000);
  if(next.getUTCFullYear()<1)return '0001-01-01';if(next.getUTCFullYear()>9999)return '9999-12-31';return iso(next);
}
function validMonth(month: string|undefined) {return !!month && /^\d{4}-\d{2}$/u.test(month) && !!parseISODate(`${month}-01`);}
export function isSelectableDate(date: ISODate, options: Pick<CalendarBase,'min'|'max'|'isDateDisabled'>): boolean {
  return !!parseISODate(date) && (!options.min || (!!parseISODate(options.min) && date>=options.min))
    && (!options.max || (!!parseISODate(options.max) && date<=options.max)) && !options.isDateDisabled?.(date);
}
/** Private range highlight for DateRangePicker endpoints; presentation only, never selection. */
export const CalendarRangeContext=createContext<DateRange|null>(null);
function rangePart(date: ISODate, range: DateRange|null): 'start'|'middle'|'end'|undefined {
  if(!range?.start||!range.end||range.end<range.start)return undefined;
  return date===range.start?'start':date===range.end?'end':date>range.start&&date<range.end?'middle':undefined;
}
/** Private shared civil calendar; selection is owned by its calling control. */
export function CalendarSurface(props: CalendarBase & SurfaceProps & {label:string;selected:ISODate|null;isSelected:(date:ISODate)=>boolean;onSelect:(date:ISODate)=>void;multiple?:boolean;disabledDescription?:string}) {
  const {selected,isSelected,onSelect,multiple,disabledDescription,referenceDate,min,max,isDateDisabled,weekStartsOn,initialMonth,label,className,style,'data-testid':testId}=props;
  if(!parseISODate(referenceDate))throw new TypeError('Calendar referenceDate must be a valid ISODate');
  const scope=useNovaScope(),range=useContext(CalendarRangeContext);
  const initial=validMonth(initialMonth)?initialMonth!:monthOf(selected??referenceDate);
  const [month,setMonth]=useState(initial),[focused,setFocused]=useState(selected&&monthOf(selected)===initial?selected:`${initial}-${referenceDate.slice(8)}`);
  const grid=useRef<HTMLTableElement>(null),moveFocus=useRef(false),id=useId();
  const first=`${month}-01`,parsedFirst=parseISODate(first)!;
  const start=weekStartsOn??(scope.locale.startsWith('vi')?1:0);
  const offset=(parsedFirst.getUTCDay()-start+7)%7;
  const [year,numberMonth]=month.split('-').map(Number) as [number,number];
  const count=monthLength(year,numberMonth),cells=Math.ceil((offset+count)/7)*7;
  const fallback=`${month}-${String(Math.min(Number(referenceDate.slice(8)),count)).padStart(2,'0')}`;
  const active=parseISODate(focused)&&monthOf(focused)===month?focused:fallback;
  const full=new Intl.DateTimeFormat(scope.locale,{weekday:'long',year:'numeric',month:'long',day:'numeric',timeZone:'UTC'});
  const title=new Intl.DateTimeFormat(scope.locale,{month:'long',year:'numeric',timeZone:'UTC'}).format(parsedFirst);
  useLayoutEffect(()=>{if(moveFocus.current){grid.current?.querySelector<HTMLButtonElement>(`[data-date="${active}"]`)?.focus();moveFocus.current=false;}},[month,active]);
  function move(next: ISODate) {moveFocus.current=true;setFocused(next);setMonth(monthOf(next));}
  function key(event: KeyboardEvent<HTMLButtonElement>,date: ISODate) {
    if(event.defaultPrevented || event.altKey || event.metaKey || event.ctrlKey)return;
    const weekday=(parseISODate(date)!.getUTCDay()-start+7)%7;
    const delta=event.key==='ArrowLeft'?(scope.dir==='rtl'?1:-1):event.key==='ArrowRight'?(scope.dir==='rtl'?-1:1):event.key==='ArrowUp'?-7:event.key==='ArrowDown'?7:event.key==='Home'?-weekday:event.key==='End'?6-weekday:null;
    if(delta!==null){event.preventDefault();move(shiftDay(date,delta));}
    else if(event.key==='PageUp'||event.key==='PageDown'){event.preventDefault();move(shiftMonth(date,event.key==='PageUp'?-1:1));}
  }
  return <div className={cx('nova-calendar',className)} style={style} data-testid={testId}>
    <div className="nova-calendar__header"><button type="button" className="nova-calendar__nav" aria-label={scope.strings.forms.previousMonth??en.forms.previousMonth} disabled={month==='0001-01'} onClick={()=>move(shiftMonth(active,-1))}><Icon name="chevron-left"/></button>
      <span id={id} role="status" aria-live="polite" className="nova-calendar__title">{title}</span>
      <button type="button" className="nova-calendar__nav" aria-label={scope.strings.forms.nextMonth??en.forms.nextMonth} disabled={month==='9999-12'} onClick={()=>move(shiftMonth(active,1))}><Icon name="chevron-right"/></button></div>
    <table ref={grid} role="grid" aria-multiselectable={multiple||undefined} aria-label={label} aria-describedby={id}><thead><tr>{Array.from({length:7},(_,index)=><th key={index} scope="col">{new Intl.DateTimeFormat(scope.locale,{weekday:'short',timeZone:'UTC'}).format(parseISODate(shiftDay('2024-01-07',(start+index)%7))!)}</th>)}</tr></thead>
      <tbody>{Array.from({length:cells/7},(_,row)=><tr key={row}>{Array.from({length:7},(_,col)=>{
        const day=row*7+col-offset+1;if(day<1||day>count)return <td key={col}/>;
        const date=`${month}-${String(day).padStart(2,'0')}`,disabled=!isSelectableDate(date,{min,max,isDateDisabled});
        return <td key={col} aria-selected={isSelected(date)} data-range={rangePart(date,range)}><button type="button" data-date={date} tabIndex={date===active?0:-1} aria-label={full.format(parseISODate(date)!)} aria-current={date===referenceDate?'date':undefined} aria-disabled={disabled||undefined} aria-describedby={disabled?disabledDescription:undefined}
          onFocus={()=>setFocused(date)} onKeyDown={event=>key(event,date)} onClick={()=>{if(!disabled)onSelect(date);}}>{day}</button></td>;
      })}</tr>)}</tbody></table>
  </div>;
}

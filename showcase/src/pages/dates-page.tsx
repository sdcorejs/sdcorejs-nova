import {useState} from 'react';
import {Calendar,DatePicker,DateRangePicker} from '@sdcorejs/nova/date-picker';
import {TimeInput,TimeRangeInput} from '@sdcorejs/nova/time-input';
import {DateTimePicker} from '@sdcorejs/nova/date-time-picker';
import {createTemporalAdapter} from '@sdcorejs/nova/adapters/temporal';
import {Select} from '@sdcorejs/nova/select';
import {Button} from '@sdcorejs/nova/button';
import {Badge} from '@sdcorejs/nova/badge';
import {CalendarChips} from '@sdcorejs/nova/calendar-chips';
import type {DateRange} from '@sdcorejs/nova/types';
import {labels,type Locale} from '../navigation.js';
import {DemoCard,PageHead,TechDetails,TechRow,translator,type Translate} from '../ui.js';

type TimeRange={start:string|null;end:string|null};
const adapter=createTemporalAdapter();
/** The showcase "today": fixed so screenshots and tests stay deterministic. */
const TODAY='2026-10-20';
const day=(date:string)=>Date.parse(date+'T00:00:00Z');
const weekday=(date:string,locale:Locale)=>new Intl.DateTimeFormat(locale==='vi'?'vi-VN':'en-GB',{weekday:'long',timeZone:'UTC'}).format(day(date));
const minutes=(time:string)=>{const [h,m]=time.split(':').map(Number);return (h??0)*60+(m??0);};
export function DatesPage({locale}:{locale:Locale}){
 const t=translator(locale);
 return <>
  <PageHead eyebrow={labels[locale].dates} title={t('Lịch và thời gian','Schedules and time')} intro={t('Đặt lịch phỏng vấn theo múi giờ ứng viên, chọn ngày làm từ xa và xin nghỉ phép.','Book an interview in the candidate time zone, pick remote days and request leave.')}/>
  <div className="showcase-cols">
   <Interview t={t} locale={locale}/>
   <RemoteDays t={t}/>
  </div>
  <div className="showcase-cols">
   <MeetingRoom t={t} locale={locale}/>
   <Leave t={t}/>
  </div>
 </>;
}

const ZONES=[{key:'Asia/Ho_Chi_Minh',vi:'Hà Nội, Việt Nam',en:'Hà Nội, Vietnam'},{key:'Europe/Berlin',vi:'Berlin, Đức',en:'Berlin, Germany'},{key:'America/New_York',vi:'New York, Hoa Kỳ',en:'New York, United States'},{key:'UTC',vi:'Giờ phối hợp quốc tế (UTC)',en:'Coordinated Universal Time (UTC)'}];
function Interview({t,locale}:{t:Translate;locale:Locale}){
 const [date,setDate]=useState<string|null>('2026-10-24'),[slot,setSlot]=useState<TimeRange>({start:'09:30',end:'10:15'}),[zone,setZone]=useState<string|null>('Europe/Berlin'),[instant,setInstant]=useState<string|null>('2026-10-24T07:30:00Z');
 const left=date?Math.round((day(date)-day(TODAY))/86_400_000):null;
 const length=slot.start&&slot.end?(minutes(slot.end)-minutes(slot.start)+1440)%1440:null;
 return <DemoCard title={t('Đặt lịch phỏng vấn','Schedule an interview')} meta={t('Ứng viên: Lê Võ Minh Khôi · Kỹ sư dữ liệu','Candidate: Lê Võ Minh Khôi · Data engineer')}>
  <div className="showcase-field-grid">
   <DatePicker label={t('Ngày phỏng vấn','Interview date')} referenceDate={TODAY} min={TODAY} value={date} onValueChange={setDate} description={date&&left!==null?weekday(date,locale)+' · '+(left>=0?t('còn '+left+' ngày','in '+left+' days'):t('đã qua','in the past')):t('Chọn một ngày.','Pick a day.')}/>
   <TimeRangeInput label={t('Khung giờ (giờ Hà Nội)','Time slot (Hà Nội time)')} value={slot} onValueChange={setSlot} description={length!==null?t(length+' phút.',length+' minutes.'):t('Nhập giờ bắt đầu và kết thúc.','Enter a start and end time.')}/>
   <Select<string,string> label={t('Múi giờ ứng viên','Candidate time zone')} options={ZONES.map(item=>({key:item.key,label:t(item.vi,item.en),data:item.key}))} value={zone} onValueChange={setZone}/>
   <DateTimePicker label={t('Giờ gửi lời mời (giờ ứng viên)','Invitation time (candidate time)')} timeZone={zone??'UTC'} referenceDate={TODAY} value={instant} onValueChange={setInstant} adapter={adapter} description={t('Hiển thị theo múi giờ đã chọn.','Shown in the selected time zone.')}/>
  </div>
  <TechDetails t={t} topic={t('giá trị','values')}><code>{JSON.stringify({interview:date,slot,timeZone:zone,invitation:instant})}</code></TechDetails>
 </DemoCard>;
}

function RemoteDays({t}:{t:Translate}){
 const [dates,setDates]=useState<readonly string[]>(['2026-10-20','2026-10-22']);
 return <DemoCard data-testid="chips-demo" title={t('Ngày làm việc từ xa','Remote work days')} meta={t('Tối đa 3 ngày, đăng ký trước thứ Sáu.','Up to 3 days, booked by Friday.')}>
  <CalendarChips label={t('Chọn ngày làm việc từ xa','Choose remote work days')} referenceDate={TODAY} min={TODAY} value={dates} onValueChange={setDates} maxDates={3}/>
  <p className="showcase-meta">{t('Đã chọn '+dates.length+' / 3 ngày.',dates.length+' of 3 days selected.')}</p>
  <TechDetails t={t} topic={t('giá trị','values')}><TechRow label="Selected dates"><output aria-label="Selected dates">{JSON.stringify(dates)}</output></TechRow></TechDetails>
 </DemoCard>;
}

const BOOKINGS:Record<string,readonly {time:string;vi:string;en:string}[]>={
 '2026-10-20':[{time:'09:00–10:00',vi:'Họp giao ban khối Công nghệ',en:'Technology weekly sync'},{time:'14:00–15:30',vi:'Phỏng vấn vị trí Kỹ sư dữ liệu',en:'Data engineer interview'}],
 '2026-10-21':[{time:'10:30–11:30',vi:'Đánh giá thử việc – Trần Minh Khang',en:'Probation review – Trần Minh Khang'}],
 '2026-10-23':[{time:'15:00–17:00',vi:'Đào tạo an toàn lao động',en:'Workplace safety training'}],
};
function MeetingRoom({t,locale}:{t:Translate;locale:Locale}){
 const [date,setDate]=useState<string|null>(TODAY),list=date?BOOKINGS[date]??[]:[];
 return <DemoCard title={t('Phòng họp Sông Hàn','Sông Hàn meeting room')} meta={t('Tầng 12 · 10 chỗ ngồi','Floor 12 · seats 10')} className="showcase-card--calendar">
  <Calendar label={t('Lịch phòng họp tháng 10','Meeting room calendar, October')} referenceDate={TODAY} value={date} onValueChange={setDate} weekStartsOn={1}/>
  <div className="showcase-stack">
   <h3>{date?weekday(date,locale)+' '+date.split('-').reverse().join('/'):t('Chưa chọn ngày','No day selected')}</h3>
   {list.length?<ul className="showcase-list">{list.map(item=><li key={item.time}><span className="showcase-list__text"><span>{t(item.vi,item.en)}</span><span className="showcase-meta">{item.time}</span></span><Badge tone="info">{t('Đã đặt','Booked')}</Badge></li>)}</ul>:<p className="showcase-muted">{t('Phòng trống cả ngày.','Free all day.')}</p>}
  </div>
 </DemoCard>;
}

function Leave({t}:{t:Translate}){
 const [range,setRange]=useState<DateRange>({start:'2026-11-09',end:'2026-11-11'}),[handover,setHandover]=useState<string|null>('16:30'),[sent,setSent]=useState(false);
 const days=range.start&&range.end?Math.round((day(range.end)-day(range.start))/86_400_000)+1:null;
 return <DemoCard title={t('Đơn nghỉ phép','Leave request')} meta={t('Số dư: 7,5 ngày','Balance: 7.5 days')}
  footer={<><p className="showcase-meta" role="status">{sent?t('Đã gửi đơn cho Lê Hoàng Minh Quân duyệt.','Sent to Lê Hoàng Minh Quân for approval.'):days!==null&&days>0?t('Xin nghỉ '+days+' ngày.','Requesting '+days+' days.'):t('Chọn khoảng ngày nghỉ.','Choose the leave dates.')}</p><Button disabled={!days||days<1} onClick={()=>setSent(true)}>{t('Gửi đơn','Send request')}</Button></>}>
  <DateRangePicker label={t('Thời gian nghỉ','Leave dates')} referenceDate={TODAY} min={TODAY} value={range} onValueChange={value=>{setRange(value);setSent(false);}}/>
  <TimeInput label={t('Giờ bàn giao công việc','Handover time')} value={handover} onValueChange={setHandover} description={t('Vào ngày làm việc trước kỳ nghỉ.','On the working day before your leave.')}/>
 </DemoCard>;
}

import {useState} from 'react';
import {Calendar,DatePicker,DateRangePicker} from '@sdcorejs/nova/date-picker';
import {TimeInput,TimeRangeInput} from '@sdcorejs/nova/time-input';
import {DateTimePicker} from '@sdcorejs/nova/date-time-picker';
import {createTemporalAdapter} from '@sdcorejs/nova/adapters/temporal';
import {Select} from '@sdcorejs/nova/select';
import {Card} from '@sdcorejs/nova/card';
import {PageHeading,type Locale} from '../navigation.js';
import {CalendarChips} from '@sdcorejs/nova/calendar-chips';
const adapter=createTemporalAdapter();
export function DatesPage({locale}:{locale:Locale}){const t=(vi:string,en:string)=>locale==='vi'?vi:en,[zone,setZone]=useState<string|null>('Asia/Ho_Chi_Minh');return <><PageHeading title={t('Đúng ngày, đúng thời điểm.','Dates and times, clearly.')} intro={t('Chọn ngày theo lịch và thời điểm theo múi giờ bạn chỉ định.','Choose calendar dates and instants in an explicit time zone.')}/><div className="showcase-demo-grid"><Card className="showcase-demo"><h2>{t('Lịch','Calendar')}</h2><Calendar label={t('Lịch tháng','Month calendar')} referenceDate="2026-10-14" defaultValue="2026-10-14"/></Card><Card className="showcase-demo"><DatePicker label={t('Ngày hẹn','Date')} referenceDate="2026-10-14" defaultValue="2026-10-14"/><DateRangePicker label={t('Khoảng ngày','Date range')} referenceDate="2026-10-14"/><TimeInput label={t('Giờ hẹn','Time')} defaultValue="09:30"/><TimeRangeInput label={t('Khoảng giờ','Time range')} defaultValue={{start:'23:00',end:'01:00'}} allowOvernight/></Card></div><Card className="showcase-demo"><Select label={t('Múi giờ','Time zone')} value={zone} onValueChange={setZone} options={['Asia/Ho_Chi_Minh','America/New_York','UTC'].map(key=>({key,label:key,data:key}))}/><DateTimePicker label={t('Lịch hẹn theo múi giờ','Zoned appointment')} timeZone={zone??'UTC'} referenceDate="2026-10-14" defaultValue="2026-10-14T02:30:00Z" adapter={adapter}/></Card><DateSelection locale={locale}/></>;}

function DateSelection({locale}:{locale:Locale}){const [dates,setDates]=useState<readonly string[]>(['2026-10-14']);return <Card className="showcase-demo" data-testid="chips-demo"><h2>{locale==='vi'?'Các ngày đã chọn':'Selected calendar dates'}</h2><CalendarChips label={locale==='vi'?'Chọn nhiều ngày':'Choose multiple dates'} referenceDate="2026-10-14" value={dates} onValueChange={setDates} maxDates={3}/><output aria-label="Selected dates">{JSON.stringify(dates)}</output></Card>;}

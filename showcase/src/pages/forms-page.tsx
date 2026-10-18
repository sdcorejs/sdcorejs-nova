import {useRef,useState} from 'react';
import {Button} from '@sdcorejs/nova/button';
import {Avatar} from '@sdcorejs/nova/avatar';
import {Badge} from '@sdcorejs/nova/badge';
import {Card,Section} from '@sdcorejs/nova/card';
import {Field} from '@sdcorejs/nova/field';
import {Input} from '@sdcorejs/nova/input';
import {Checkbox} from '@sdcorejs/nova/checkbox';
import {Switch} from '@sdcorejs/nova/switch';
import {RadioGroup} from '@sdcorejs/nova/radio-group';
import {Alert} from '@sdcorejs/nova/alert';
import type {Locale} from '../navigation.js';
import {NumberInput} from '@sdcorejs/nova/number-input';
import {Select,Combobox,Autocomplete} from '@sdcorejs/nova/select';
import {MultiSelect,ChipInput} from '@sdcorejs/nova/multi-select';
import {InlineText} from '@sdcorejs/nova/inline-text';
import {SegmentedControl} from '@sdcorejs/nova/segmented-control';
import {useForm} from 'react-hook-form';
import {useNovaController} from '@sdcorejs/nova/adapters/react-hook-form';
import {ColorInput} from '@sdcorejs/nova/color-input';
const INITIAL={name:'Nguyễn An',email:'an.nguyen@example.com',updates:true,digest:false,language:'vi'};
export function FormsPage({locale='vi'}:{locale?:Locale}){
 const t=(vi:string,en:string)=>locale==='vi'?vi:en,save=useRef<HTMLButtonElement>(null);
 const [values,setValues]=useState(INITIAL),[confirmed,setConfirmed]=useState(false);
 const dirty=JSON.stringify(values)!==JSON.stringify(INITIAL);
 function update<K extends keyof typeof INITIAL>(key:K,value:(typeof INITIAL)[K]){setValues(v=>({...v,[key]:value}));setConfirmed(false);}
 return <>
    <div className="showcase-page-heading"><div><p className="showcase-eyebrow">{t('COMPONENT / BIỂU MẪU','COMPONENT / FORMS')}</p><h1>{t('Thiết lập theo cách của bạn.','Make it yours.')}</h1><p className="showcase-page-intro">{t('Một ví dụ nhỏ về hồ sơ và tùy chọn cá nhân với Nova.','A small profile and preferences example with Nova.')}</p></div><Badge tone="neutral">{t('Bản mẫu','Preview')}</Badge></div>
    <form onSubmit={event=>{event.preventDefault();setConfirmed(true);}}>
     <Card className="showcase-settings-card">
      <div className="showcase-profile-heading"><Avatar name={values.name||INITIAL.name} size="lg"/><div><h2>{t('Hồ sơ cá nhân','Personal profile')}</h2><p>{t('Thông tin giúp mọi người nhận ra bạn.','Details that help people recognize you.')}</p></div></div>
      <div className="showcase-field-grid"><Field label={t('Tên hiển thị','Display name')}><Input className="showcase-profile-input" nameFromField name="displayName" autoComplete="name" value={values.name} onValueChange={value=>update('name',value)}/></Field><Field label={t('Địa chỉ email','Email address')}><Input className="showcase-profile-input" nameFromField type="email" name="email" autoComplete="email" value={values.email} onValueChange={value=>update('email',value)}/></Field></div>
      <div className="showcase-divider"/>
      <Section title={t('Tùy chọn','Preferences')} description={t('Chọn những gì phù hợp với cách bạn sử dụng.','Choose what suits how you work.')}>
       <div className="showcase-preference-row"><div><h3>{t('Cập nhật qua email','Email updates')}</h3><p>{t('Nhận thông tin mới khi có thay đổi quan trọng.','Hear about important changes.')}</p></div><Switch aria-label={t('Cập nhật qua email','Email updates')} value={values.updates} onValueChange={value=>update('updates',value)}/></div>
       <div className="showcase-language-row"><div><h3>{t('Ngôn ngữ','Language')}</h3><p>{t('Ngôn ngữ bạn muốn sử dụng.','Your preferred language.')}</p></div><RadioGroup label={t('Chọn ngôn ngữ','Choose language')} className="showcase-language-options" orientation="horizontal" name="language" value={values.language} onValueChange={value=>{if(value!==null)update('language',value);}} options={[{value:'vi',label:'Tiếng Việt'},{value:'en',label:'English'}]}/></div>
       <div className="showcase-checkbox-row"><Checkbox label={t('Gửi bản tổng hợp hằng tuần','Send a weekly digest')} description={t('Một email ngắn để xem lại các cập nhật.','A short email to catch up on updates.')} value={values.digest} onValueChange={value=>update('digest',value===true)}/></div>
      </Section>
      <div className="showcase-divider showcase-divider--footer"/>
      <div className="showcase-form-footer"><div className="showcase-save-status" role="status"><span className={dirty?'showcase-status-dot showcase-status-dot--dirty':'showcase-status-dot'}/>{dirty?t('Có thay đổi trong bản mẫu','Preview has changes'):t('Bạn có thể chỉnh sửa để thử','Edit to try it out')}</div><div className="showcase-actions"><Button variant="ghost" size="lg" onClick={()=>{setValues(INITIAL);setConfirmed(false);}}>{t('Đặt lại','Reset')}</Button><Button ref={save} type="submit" size="lg">{t('Lưu bản mẫu','Save preview')}</Button></div></div>
     </Card>
     <div className="showcase-confirmation" role="status" aria-live="polite" aria-atomic="true">{confirmed&&<Alert tone="success" title={t('Đã giữ thay đổi trong bản mẫu','Changes kept in this preview')} onDismiss={()=>{setConfirmed(false);save.current?.focus();}}>{t('Chỉ có hiệu lực trong trang đang mở. Chưa lưu vào tài khoản.','Only affects this open page. Not saved to an account.')}</Alert>}</div>
    </form>
    <P1Controls locale={locale}/>
    <AccentColor locale={locale}/>
    <div className="showcase-context-note"><span className="showcase-note-rule"/><p>{t('Một màn hình, một việc cần làm.','One screen, one purpose.')}<br/><span>{t('Các control được nhóm theo nội dung, với khoảng thở vừa đủ.','Related controls grouped with room to breathe.')}</span></p></div>
 </>;
}

function AccentColor({locale}:{locale:Locale}){const [value,setValue]=useState<string|null>('#173B3F'),t=(vi:string,en:string)=>locale==='vi'?vi:en;return <Card className="showcase-demo"><h2>{t('Màu nhấn cá nhân','Personal accent color')}</h2><ColorInput label={t('Màu nhấn','Accent color')} value={value} onValueChange={setValue}/><p>{t('Màu đã nhận','Accepted color')}: <output aria-label="Accepted color">{value??t('Không có','None')}</output></p></Card>;}

function P1Controls({locale}:{locale:Locale}){const t=(vi:string,en:string)=>locale==='vi'?vi:en,[selected,setSelected]=useState<readonly number[]>([0]),[mode,setMode]=useState<boolean|null>(false),[sent,setSent]=useState(false);const options=[{key:0,label:t('Không','Zero'),data:0},{key:1,label:t('Một','One'),data:1},{key:2,label:t('Hai','Two'),data:2}];const {control,handleSubmit}=useForm({defaultValues:{note:''}}),note=useNovaController({control,name:'note',rules:{required:t('Vui lòng nhập ghi chú.','Enter a note.')}});return <Card className="showcase-demo"><h2>{t('Biểu mẫu linh hoạt','Flexible forms')}</h2><form onSubmit={handleSubmit(()=>setSent(true))}><div className="showcase-demo-grid"><NumberInput label={t('Số lượng','Quantity')} defaultValue={0} name="quantity"/><Select label={t('Chọn một','Select one')} options={options} defaultValue={0} name="choice" clearable/><Combobox label={t('Tìm và chọn','Search and choose')} options={options} name="search"/><Autocomplete label={t('Thành phố','City')} suggestions={['Hà Nội','Đà Nẵng','Hồ Chí Minh']}/><MultiSelect label={t('Chọn nhiều','Select many')} options={options} value={selected} onValueChange={setSelected} name="many"/><ChipInput label={t('Nhãn','Tags')} defaultValue={['Nova']} name="tag"/><InlineText label={t('Tên ngắn','Short name')} defaultValue="Nova" clearable/><SegmentedControl label={t('Chế độ','Mode')} items={[{value:false,label:t('Gọn','Compact')},{value:true,label:t('Đầy đủ','Full')}]} value={mode} onValueChange={setMode}/><Input {...note} label={t('Ghi chú bắt buộc','Required note')}/></div><Button type="submit">{t('Gửi bản mẫu','Submit example')}</Button>{sent&&<p role="status">{t('Đã gửi trong trang đang mở.','Submitted in this open page.')}</p>}</form></Card>;}

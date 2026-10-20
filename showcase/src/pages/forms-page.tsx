import {useRef,useState} from 'react';
import {useForm} from 'react-hook-form';
import {Button} from '@sdcorejs/nova/button';
import {Avatar} from '@sdcorejs/nova/avatar';
import {Badge} from '@sdcorejs/nova/badge';
import {Input} from '@sdcorejs/nova/input';
import {Checkbox} from '@sdcorejs/nova/checkbox';
import {Switch} from '@sdcorejs/nova/switch';
import {RadioGroup} from '@sdcorejs/nova/radio-group';
import {Alert} from '@sdcorejs/nova/alert';
import {NumberInput} from '@sdcorejs/nova/number-input';
import {Select,Combobox,Autocomplete} from '@sdcorejs/nova/select';
import {MultiSelect,ChipInput} from '@sdcorejs/nova/multi-select';
import {InlineText} from '@sdcorejs/nova/inline-text';
import {SegmentedControl} from '@sdcorejs/nova/segmented-control';
import {ColorInput} from '@sdcorejs/nova/color-input';
import {useNovaController} from '@sdcorejs/nova/adapters/react-hook-form';
import {labels,type Locale} from '../navigation.js';
import {DemoCard,PageHead,TechDetails,TechRow,translator,type Translate} from '../ui.js';

const INITIAL={name:'Nguyễn An',email:'an.nguyen@congty.vn',updates:true,digest:false};
export function FormsPage({locale,onLocaleChange}:{locale:Locale;onLocaleChange:(locale:Locale)=>void}){
 const t=translator(locale);
 return <>
  <PageHead eyebrow={labels[locale].forms} title={t('Hồ sơ và đăng ký','Profile and registration')} intro={t('Hai tình huống thật: cập nhật thông tin cá nhân và đăng ký khóa đào tạo cho nhóm.','Two real tasks: updating a personal profile and registering a team for training.')}/>
  <ProfileForm t={t} locale={locale} onLocaleChange={onLocaleChange}/>
  <TrainingForm t={t}/>
 </>;
}

function ProfileForm({t,locale,onLocaleChange}:{t:Translate;locale:Locale;onLocaleChange:(locale:Locale)=>void}){
 const save=useRef<HTMLButtonElement>(null);
 const [values,setValues]=useState(INITIAL),[saved,setSaved]=useState(INITIAL),[confirmed,setConfirmed]=useState(false),[savedAt,setSavedAt]=useState<string|null>(null);
 const dirty=JSON.stringify(values)!==JSON.stringify(saved);
 function update<K extends keyof typeof INITIAL>(key:K,value:(typeof INITIAL)[K]){setValues(v=>({...v,[key]:value}));setConfirmed(false);}
 const status=dirty?t('Có thay đổi chưa lưu.','You have unsaved changes.'):savedAt?t('Đã lưu lúc ','Saved at ')+savedAt+'.':t('Chưa có thay đổi.','No changes yet.');
 return <form onSubmit={event=>{event.preventDefault();setSaved(values);setSavedAt(new Date().toLocaleTimeString(locale==='vi'?'vi-VN':'en-GB',{hour:'2-digit',minute:'2-digit'}));setConfirmed(true);}}>
  <DemoCard title={t('Thông tin cá nhân','Personal details')} meta={t('Hiển thị trong hồ sơ nội bộ và chữ ký email.','Shown on your internal profile and email signature.')} lead={<Avatar name={values.name||INITIAL.name} size="lg" decorative/>} actions={<Badge tone="neutral">{t('Bản mẫu','Preview')}</Badge>}
   footer={<><p className="showcase-meta" role="status">{status}</p><div className="showcase-toolbar"><Button variant="secondary" onClick={()=>{setValues(INITIAL);setSaved(INITIAL);setSavedAt(null);setConfirmed(false);}}>{t('Đặt lại','Reset')}</Button><Button ref={save} type="submit">{t('Lưu thay đổi','Save changes')}</Button></div></>}>
   <div className="showcase-field-grid">
    <Input name="displayName" autoComplete="name" maxLength={40} required label={t('Tên hiển thị','Display name')} description={t('Tối đa 40 ký tự.','Up to 40 characters.')} value={values.name} onValueChange={value=>update('name',value)}/>
    <Input type="email" name="email" autoComplete="email" label={t('Email liên hệ','Contact email')} description={t('Dùng để nhận thông báo hệ thống.','Used for system notifications.')} value={values.email} onValueChange={value=>update('email',value)}/>
    <RadioGroup<Locale> name="language" orientation="horizontal" label={t('Ngôn ngữ giao diện','Interface language')} description={t('Đổi ngay ngôn ngữ của showcase.','Switches the showcase language right away.')} value={locale} onValueChange={value=>{if(value!==null)onLocaleChange(value);}} options={[{value:'vi',label:<span lang="vi">Tiếng Việt</span>},{value:'en',label:<span lang="en">English</span>}]}/>
   </div>
   <div className="showcase-choice-row">
    <Switch label={t('Cập nhật qua email','Email updates')} description={t('Khi hồ sơ của bạn được duyệt hoặc trả lại.','When your profile is approved or returned.')} value={values.updates} onValueChange={value=>update('updates',value)}/>
    <Checkbox label={t('Gửi bản tổng hợp hằng tuần','Send a weekly digest')} description={t('Sáng thứ Hai, 08:00.','Monday mornings at 08:00.')} value={values.digest} onValueChange={value=>update('digest',value===true)}/>
   </div>
  </DemoCard>
  <div className="showcase-announcement" role="status" aria-live="polite" aria-atomic="true">{confirmed&&<Alert tone="success" title={t('Đã lưu thay đổi','Changes saved')} onDismiss={()=>{setConfirmed(false);save.current?.focus();}}>{t('Bản mẫu chỉ giữ thay đổi trong trang đang mở. Chưa lưu vào tài khoản.','This preview keeps changes in the open page only. Not saved to an account.')}</Alert>}</div>
 </form>;
}

type Course='interview'|'leadership'|'excel'|'safety';
type Mode='onsite'|'online';
const TRAINERS=[{key:'NV-10262',label:'Phạm Thị Thu Hà'},{key:'NV-10031',label:'Đỗ Quang Vinh'},{key:'NV-10377',label:'Huỳnh Ngọc Bảo Trâm'},{key:'EXT-021',label:'Trịnh Công Minh'}] as const;
const CITIES=['Hà Nội','Đà Nẵng','TP. Hồ Chí Minh','Cần Thơ'];
const SEATS:Record<Course,number>={interview:6,leadership:3,excel:12,safety:20};
const TRAINING_INITIAL={course:'interview' as Course|null,trainer:'NV-10262' as string|null,city:'Đà Nẵng',seats:4 as number|null,mode:'onsite' as Mode|null,audience:['new-manager'] as readonly string[],tags:['Quý 4'] as readonly string[],className:'K12 · Đà Nẵng'};
function TrainingForm({t}:{t:Translate}){
 const [values,setValues]=useState(TRAINING_INITIAL),[color,setColor]=useState<string|null>('#6941C6'),[sent,setSent]=useState(false);
 const {control,handleSubmit,reset}=useForm({defaultValues:{reason:''}});
 const reason=useNovaController({control,name:'reason',rules:{required:t('Vui lòng nêu lý do đăng ký.','Tell us why the team needs this course.')}});
 function update<K extends keyof typeof TRAINING_INITIAL>(key:K,value:(typeof TRAINING_INITIAL)[K]){setValues(v=>({...v,[key]:value}));setSent(false);}
 const courses=[{key:'interview' as Course,label:t('Kỹ năng phỏng vấn theo năng lực','Competency-based interviewing'),data:'interview'},{key:'leadership' as Course,label:t('Lãnh đạo cho quản lý mới','Leadership for new managers'),data:'leadership'},{key:'excel' as Course,label:t('Phân tích dữ liệu với Excel','Data analysis with Excel'),data:'excel'},{key:'safety' as Course,label:t('An toàn lao động','Workplace safety'),data:'safety'}];
 const audience=[{key:'new-manager',label:t('Quản lý mới','New managers'),data:'new-manager'},{key:'team-lead',label:t('Trưởng nhóm','Team leads'),data:'team-lead'},{key:'sales',label:t('Nhân viên kinh doanh','Sales staff'),data:'sales'},{key:'engineer',label:t('Kỹ sư','Engineers'),data:'engineer'}];
 const seatsLeft=values.course?SEATS[values.course]:null;
 return <form noValidate onSubmit={handleSubmit(()=>setSent(true))}>
  <DemoCard title={t('Đăng ký khóa đào tạo','Training registration')} meta={t('Đăng ký cho nhóm của bạn trong quý 4.','Register your team for Q4.')}
   footer={<><p className="showcase-meta" role="status">{sent?t('Đã gửi đăng ký. Phòng Nhân sự sẽ xác nhận qua email.','Registration sent. HR will confirm by email.'):t('Phí do phòng Nhân sự chi trả.','Fees are covered by HR.')}</p><div className="showcase-toolbar"><Button variant="ghost" onClick={()=>{setValues(TRAINING_INITIAL);setColor('#6941C6');reset();setSent(false);}}>{t('Hủy','Cancel')}</Button><Button type="submit">{t('Gửi đăng ký','Submit registration')}</Button></div></>}>
   <div className="showcase-field-grid">
    <Select<string,Course> label={t('Khóa học','Course')} name="course" clearable options={courses} value={values.course} onValueChange={value=>update('course',value)} description={seatsLeft===null?t('Chọn một khóa học.','Choose a course.'):t('Còn '+seatsLeft+' chỗ.',seatsLeft+' seats left.')}/>
    <Combobox<string,string> label={t('Giảng viên','Trainer')} name="trainer" options={TRAINERS.map(item=>({key:item.key,label:item.label,data:item.key}))} value={values.trainer} onValueChange={value=>update('trainer',value)} description={t('Tìm theo tên.','Search by name.')}/>
    <Autocomplete label={t('Địa điểm','Location')} suggestions={CITIES} value={values.city} onValueChange={value=>update('city',value)} description={t('Gợi ý: Hà Nội, Đà Nẵng, TP. Hồ Chí Minh.','Suggestions: Hà Nội, Đà Nẵng, TP. Hồ Chí Minh.')}/>
    <NumberInput label={t('Số người tham gia','Participants')} name="seats" min={1} max={6} value={values.seats} onValueChange={value=>update('seats',value)} description={t('Từ 1 đến 6 người.','From 1 to 6 people.')}/>
    <SegmentedControl<Mode> label={t('Hình thức','Format')} items={[{value:'onsite',label:t('Trực tiếp','In person')},{value:'online',label:t('Trực tuyến','Online')}]} value={values.mode} onValueChange={value=>update('mode',value)}/>
    <MultiSelect<string,string> label={t('Đối tượng','Audience')} name="audience" options={audience} value={values.audience} onValueChange={value=>update('audience',value)}/>
    <ChipInput label={t('Nhãn','Tags')} name="tags" value={values.tags} onValueChange={value=>update('tags',value)} description={t('Nhấn Enter để thêm nhãn.','Press Enter to add a tag.')}/>
    <InlineText label={t('Tên lớp','Class name')} value={values.className} onValueChange={value=>update('className',value)} clearable/>
    <ColorInput label={t('Màu trên lịch','Calendar color')} value={color} onValueChange={setColor}/>
    <Input {...reason} label={t('Lý do đăng ký','Reason for registering')} description={t('Bắt buộc. Một đến hai câu là đủ.','Required. One or two sentences is enough.')}/>
   </div>
   <TechDetails t={t} topic={t('giá trị biểu mẫu','form values')}>
    <TechRow label="Accepted color"><output aria-label="Accepted color">{color??t('Không có','None')}</output></TechRow>
    <TechRow label="values"><code>{JSON.stringify({...values,color})}</code></TechRow>
   </TechDetails>
  </DemoCard>
 </form>;
}

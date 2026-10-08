import {useState} from 'react';
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
const INITIAL={name:'Nguyễn An',email:'an.nguyen@example.com',updates:true,digest:false,language:'vi'};
export function FormsPage(){
 const [values,setValues]=useState(INITIAL),[confirmed,setConfirmed]=useState(false);
 const dirty=JSON.stringify(values)!==JSON.stringify(INITIAL);
 function update<K extends keyof typeof INITIAL>(key:K,value:(typeof INITIAL)[K]){setValues(v=>({...v,[key]:value}));setConfirmed(false);}
 return <>
    <div className="showcase-page-heading"><div><p className="showcase-eyebrow">COMPONENT / BIỂU MẪU</p><h1>Thiết lập theo cách của bạn.</h1><p className="showcase-page-intro">Một ví dụ nhỏ về hồ sơ và tùy chọn cá nhân với Nova.</p></div><Badge tone="neutral">Bản mẫu</Badge></div>
    <form onSubmit={event=>{event.preventDefault();setConfirmed(true);}}>
     <Card className="showcase-settings-card">
      <div className="showcase-profile-heading"><Avatar name={values.name||INITIAL.name} size="lg"/><div><h2>Hồ sơ cá nhân</h2><p>Thông tin giúp mọi người nhận ra bạn.</p></div></div>
      <div className="showcase-field-grid"><Field label="Tên hiển thị"><Input className="showcase-profile-input" nameFromField name="displayName" autoComplete="name" value={values.name} onValueChange={value=>update('name',value)}/></Field><Field label="Địa chỉ email"><Input className="showcase-profile-input" nameFromField type="email" name="email" autoComplete="email" value={values.email} onValueChange={value=>update('email',value)}/></Field></div>
      <div className="showcase-divider"/>
      <Section title="Tùy chọn" description="Chọn những gì phù hợp với cách bạn sử dụng.">
       <div className="showcase-preference-row"><div><h3>Cập nhật qua email</h3><p>Nhận thông tin mới khi có thay đổi quan trọng.</p></div><Switch aria-label="Cập nhật qua email" value={values.updates} onValueChange={value=>update('updates',value)}/></div>
       <div className="showcase-language-row"><div><h3>Ngôn ngữ</h3><p>Ngôn ngữ bạn muốn sử dụng.</p></div><RadioGroup label="Chọn ngôn ngữ" className="showcase-language-options" orientation="horizontal" name="language" value={values.language} onValueChange={value=>{if(value!==null)update('language',value);}} options={[{value:'vi',label:'Tiếng Việt'},{value:'en',label:'English'}]}/></div>
       <div className="showcase-checkbox-row"><Checkbox label="Gửi bản tổng hợp hằng tuần" description="Một email ngắn để xem lại các cập nhật." value={values.digest} onValueChange={value=>update('digest',value===true)}/></div>
      </Section>
      <div className="showcase-divider showcase-divider--footer"/>
      <div className="showcase-form-footer"><div className="showcase-save-status" role="status"><span className={dirty?'showcase-status-dot showcase-status-dot--dirty':'showcase-status-dot'}/>{dirty?'Có thay đổi trong bản mẫu':'Bạn có thể chỉnh sửa để thử'}</div><div className="showcase-actions"><Button variant="ghost" size="lg" onClick={()=>{setValues(INITIAL);setConfirmed(false);}}>Đặt lại</Button><Button type="submit" size="lg">Lưu bản mẫu</Button></div></div>
     </Card>
     {confirmed&&<div className="showcase-confirmation"><Alert tone="success" title="Đã giữ thay đổi trong bản mẫu" onDismiss={()=>setConfirmed(false)}>Chỉ có hiệu lực trong trang đang mở. Chưa lưu vào tài khoản.</Alert></div>}
    </form>
    <div className="showcase-context-note"><span className="showcase-note-rule"/><p>Một màn hình, một việc cần làm.<br/><span>Các control được nhóm theo nội dung, với khoảng thở vừa đủ.</span></p></div>
 </>;
}

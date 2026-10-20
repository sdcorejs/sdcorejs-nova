import {useState} from 'react';
import {Tabs,TabList,Tab,TabPanel} from '@sdcorejs/nova/tabs';
import {Accordion,AccordionItem,CollapsibleSection} from '@sdcorejs/nova/accordion';
import {Stepper} from '@sdcorejs/nova/stepper';
import {AnchorNavigation,AnchorSection} from '@sdcorejs/nova/anchor-navigation';
import {Checkbox} from '@sdcorejs/nova/checkbox';
import {Badge} from '@sdcorejs/nova/badge';
import {labels,type Locale} from '../navigation.js';
import {DemoCard,Icon,PageHead,translator} from '../ui.js';

type Task='laptop'|'badge'|'email';
export function NavigationPage({locale}:{locale:Locale}){
 const t=translator(locale);
 const [step,setStep]=useState('devices'),[done,setDone]=useState<Record<Task,boolean>>({laptop:true,badge:false,email:false});
 const steps=[{id:'contract',label:t('Ký hợp đồng','Sign contract'),status:'complete' as const},{id:'devices',label:t('Cấp thiết bị','Equipment'),status:'pending' as const},{id:'orientation',label:t('Hội nhập','Orientation'),status:'pending' as const},{id:'review',label:t('Đánh giá thử việc','Probation review'),status:'pending' as const}];
 const position=steps.findIndex(item=>item.id===step)+1;
 const tasks:{id:Task;label:string;team:string;due:string}[]=[
  {id:'laptop',label:t('Máy tính xách tay','Laptop'),team:t('Hạ tầng CNTT','IT infrastructure'),due:t('Hạn 01/11','Due 1 Nov')},
  {id:'badge',label:t('Thẻ ra vào tầng 12','Floor 12 access card'),team:t('An ninh tòa nhà','Building security'),due:t('Hạn 03/11','Due 3 Nov')},
  {id:'email',label:t('Tài khoản email và VPN','Email and VPN account'),team:t('Công nghệ thông tin','Information technology'),due:t('Hạn 03/11','Due 3 Nov')},
 ];
 const remaining=tasks.filter(task=>!done[task.id]).length;
 const handbook=[{id:'handbook-hours',title:t('Giờ làm việc','Working hours')},{id:'handbook-leave',title:t('Nghỉ phép','Leave')},{id:'handbook-remote',title:t('Làm từ xa','Remote work')}];
 return <>
  <PageHead eyebrow={labels[locale].navigation} title={t('Tiếp nhận nhân sự mới','Onboarding a new hire')} intro={t('Stepper cho tiến trình, Tabs cho chi tiết, Accordion cho câu hỏi và mục lục neo cho tài liệu dài.','A stepper for progress, tabs for details, an accordion for questions and anchors for long documents.')}/>
  <DemoCard title={t('Trần Minh Khang · Kỹ sư dữ liệu','Trần Minh Khang · Data engineer')} meta={t('Bước '+position+' trên '+steps.length+' · bắt đầu 03/11/2026','Step '+position+' of '+steps.length+' · starts 3 Nov 2026')}>
   <Stepper label={t('Các bước tiếp nhận','Onboarding steps')} interactive steps={steps} value={step} onValueChange={setStep}/>
   <Tabs defaultValue="todo">
    <TabList label={t('Chi tiết bước','Step details')}>
     <Tab value="todo">{t('Việc cần làm','To do')} <span className="showcase-count">{remaining}</span></Tab>
     <Tab value="docs">{t('Tài liệu','Documents')}</Tab>
     <Tab value="history">{t('Lịch sử','History')}</Tab>
    </TabList>
    <TabPanel value="todo">
     <ul className="showcase-list">{tasks.map(task=><li key={task.id}>
      <Checkbox label={task.label} description={task.team} value={done[task.id]} onValueChange={value=>setDone(current=>({...current,[task.id]:value===true}))}/>
      {done[task.id]?<Badge tone="success">{t('Xong','Done')}</Badge>:<Badge tone="warning">{task.due}</Badge>}
     </li>)}</ul>
    </TabPanel>
    <TabPanel value="docs">
     <ul className="showcase-list">
      <li><span className="showcase-list__icon"><Icon name="file"/></span><span className="showcase-list__text"><span>{t('Hợp đồng lao động đã ký','Signed employment contract')}</span><span className="showcase-meta">HĐLĐ-2026-0412.pdf · 1,2 MB</span></span><Badge tone="success">{t('Đã ký','Signed')}</Badge></li>
      <li><span className="showcase-list__icon"><Icon name="file"/></span><span className="showcase-list__text"><span>{t('Nội quy lao động','Workplace rules')}</span><span className="showcase-meta">Noi_quy_2026.pdf · 860 KB</span></span><Badge tone="info">{t('Cần đọc','To read')}</Badge></li>
     </ul>
     <CollapsibleSection title={t('Tài liệu tùy chọn','Optional documents')}><p className="showcase-muted">{t('Sổ tay phúc lợi, hướng dẫn gửi xe và danh bạ các phòng ban.','Benefits handbook, parking guide and the department directory.')}</p></CollapsibleSection>
    </TabPanel>
    <TabPanel value="history">
     <ol className="showcase-timeline">
      <li><span className="showcase-meta">28/10 · 16:20</span><span>{t('Phạm Thị Thu Hà gửi yêu cầu cấp máy tính.','Phạm Thị Thu Hà requested a laptop.')}</span></li>
      <li><span className="showcase-meta">27/10 · 09:05</span><span>{t('Trần Minh Khang ký hợp đồng lao động.','Trần Minh Khang signed the employment contract.')}</span></li>
     </ol>
    </TabPanel>
   </Tabs>
  </DemoCard>
  <div className="showcase-cols">
   <DemoCard title={t('Câu hỏi thường gặp','Frequently asked questions')}>
    <Accordion defaultValue={['bring']}>
     <AccordionItem value="bring" title={t('Ngày đầu đi làm cần mang gì?','What should I bring on day one?')}><p>{t('Căn cước công dân bản gốc, thông tin tài khoản ngân hàng và một ảnh 3×4.','Your original ID card, bank account details and one passport photo.')}</p></AccordionItem>
     <AccordionItem value="buddy" title={t('Ai là người hướng dẫn?','Who is my buddy?')}><p>{t('Lê Hoàng Minh Quân, trưởng nhóm Nền tảng dữ liệu, sẽ đồng hành trong 2 tháng đầu.','Lê Hoàng Minh Quân, lead of the Data platform team, supports you for the first two months.')}</p></AccordionItem>
     <AccordionItem value="payday" title={t('Khi nào nhận lương tháng đầu?','When is my first payday?')}><p>{t('Lương trả vào ngày 5 hằng tháng; tháng đầu tính theo số ngày làm việc thực tế.','Salary is paid on the 5th of each month; the first month is pro-rated.')}</p></AccordionItem>
    </Accordion>
   </DemoCard>
   <DemoCard title={t('Sổ tay nhân viên','Employee handbook')}>
    <div className="showcase-handbook">
     <AnchorNavigation label={t('Trên trang này','On this page')} items={handbook}/>
     <div className="showcase-handbook__content">
      <AnchorSection id="handbook-hours" title={handbook[0]!.title} headingLevel={3}><p className="showcase-muted">{t('08:30–17:30, nghỉ trưa 12:00–13:00. Linh hoạt ±1 giờ khi quản lý đồng ý.','08:30–17:30 with lunch 12:00–13:00. ±1 hour flexibility with manager approval.')}</p></AnchorSection>
      <AnchorSection id="handbook-leave" title={handbook[1]!.title} headingLevel={3}><p className="showcase-muted">{t('12 ngày phép năm, cộng 1 ngày cho mỗi 5 năm làm việc.','12 days of annual leave, plus 1 day for every 5 years of service.')}</p></AnchorSection>
      <AnchorSection id="handbook-remote" title={handbook[2]!.title} headingLevel={3}><p className="showcase-muted">{t('Tối đa 3 ngày mỗi tuần, đăng ký trước thứ Sáu tuần trước.','Up to 3 days a week, booked by the Friday before.')}</p></AnchorSection>
     </div>
    </div>
   </DemoCard>
  </div>
 </>;
}

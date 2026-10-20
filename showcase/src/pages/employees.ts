/**
 * Deterministic sample HR data for the showcase. A seeded PRNG (mulberry32)
 * replaces Math.random, so every load, screenshot and test sees the same rows.
 */
export type EmployeeStatus='active'|'probation'|'leave'|'former';
export type Employee={id:string;name:string;givenName:string;email:string;department:string;title:string;startDate:string;salary:number;status:EmployeeStatus;manager:string;location:string;phone:string};

function mulberry32(seed:number){
 let state=seed>>>0;
 return ()=>{state=(state+0x6D2B79F5)>>>0;let value=Math.imul(state^(state>>>15),1|state);value=(value+Math.imul(value^(value>>>7),61|value))^value;return ((value^(value>>>14))>>>0)/4294967296;};
}
const FAMILY=['Nguyễn','Trần','Lê','Phạm','Hoàng','Huỳnh','Phan','Vũ','Võ','Đặng','Bùi','Đỗ','Hồ','Ngô','Dương','Lý','Trương','Đinh','Lâm','Tôn Thất'];
const MIDDLE_MALE=['Văn','Minh','Quang','Đức','Hoàng','Thành','Hữu','Gia','Tuấn','Công','Bảo','Xuân'];
const MIDDLE_FEMALE=['Thị','Ngọc','Thu','Thanh','Mai','Phương','Bảo','Diệu','Kim','Hồng','Thùy','Minh'];
const GIVEN_MALE=['An','Bình','Cường','Dũng','Hiếu','Huy','Khang','Khôi','Long','Nam','Phúc','Quân','Sơn','Tài','Thắng','Trung','Vinh','Đăng','Kiên','Tùng'];
const GIVEN_FEMALE=['Anh','Chi','Dung','Hà','Hạnh','Hương','Lan','Linh','My','Ngọc','Nhung','Phương','Quỳnh','Thảo','Trang','Trâm','Uyên','Vy','Yến','Nguyệt'];
export const DEPARTMENTS:readonly {name:string;manager:string;titles:readonly string[]}[]=[
 {name:'Kỹ thuật',manager:'Lê Hoàng Minh Quân',titles:['Kỹ sư phần mềm','Kỹ sư phần mềm cấp cao','Trưởng nhóm kỹ thuật','Kỹ sư kiểm thử tự động','Kỹ sư DevOps']},
 {name:'Sản phẩm',manager:'Võ Thị Thanh Tâm',titles:['Chuyên viên phân tích nghiệp vụ','Quản lý sản phẩm','Nhà thiết kế trải nghiệm người dùng']},
 {name:'Dữ liệu',manager:'Đặng Quốc Bảo',titles:['Kỹ sư dữ liệu','Chuyên viên phân tích dữ liệu']},
 {name:'Kinh doanh',manager:'Trương Gia Huy',titles:['Chuyên viên kinh doanh','Trưởng phòng kinh doanh khu vực miền Trung','Chuyên viên chăm sóc khách hàng doanh nghiệp']},
 {name:'Nhân sự',manager:'Phạm Thị Thu Hà',titles:['Chuyên viên tuyển dụng','Chuyên viên lương và phúc lợi','Trưởng phòng Nhân sự']},
 {name:'Tài chính',manager:'Bùi Ngọc Lan',titles:['Kế toán viên','Kế toán trưởng','Chuyên viên kiểm soát nội bộ']},
 {name:'Vận hành',manager:'Hồ Văn Thắng',titles:['Điều phối viên vận hành','Chuyên viên mua hàng','Trưởng ca vận hành kho']},
 {name:'Pháp chế',manager:'Ngô Diệu Linh',titles:['Chuyên viên pháp chế']},
];
const LOCATIONS=['Hà Nội','TP. Hồ Chí Minh','Đà Nẵng'];
/** Long names on purpose: layouts must wrap or truncate them gracefully. */
const LONG_NAMES:Record<number,{name:string;given:string;female:boolean}>={3:{name:'Công Tằng Tôn Nữ Diệu Hương',given:'Hương',female:true},17:{name:'Nguyễn Hoàng Bảo Ngọc Phương Thảo',given:'Thảo',female:true},41:{name:'Tôn Thất Minh Khôi Nguyên',given:'Nguyên',female:false}};
export const ascii=(text:string)=>text.normalize('NFD').replace(/[̀-ͯ]/gu,'').replace(/đ/gu,'d').replace(/Đ/gu,'D');
const pick=<T>(random:()=>number,list:readonly T[])=>list[Math.floor(random()*list.length)]!;
const pad=(value:number)=>String(value).padStart(2,'0');
const TODAY=Date.UTC(2026,9,20);

function generate(count:number):readonly Employee[]{
 const random=mulberry32(20261020),emails=new Set<string>(),rows:Employee[]=[];
 for(let index=0;index<count;index++){
  const female=random()<0.5,family=pick(random,FAMILY),special=LONG_NAMES[index];
  const middle=pick(random,female?MIDDLE_FEMALE:MIDDLE_MALE),given=pick(random,female?GIVEN_FEMALE:GIVEN_MALE);
  const second=random()<0.2?' '+pick(random,female?MIDDLE_FEMALE:MIDDLE_MALE):'';
  const name=special?.name??`${family} ${middle}${second} ${given}`,givenName=special?.given??given;
  const parts=name.split(' '),base=`${ascii(givenName).toLowerCase()}.${ascii(parts.slice(0,-1).map(part=>part[0]).join('')).toLowerCase()}`;
  let email=base+'@congty.vn',suffix=2;while(emails.has(email))email=`${base}${suffix++}@congty.vn`;emails.add(email);
  const department=pick(random,DEPARTMENTS),title=pick(random,department.titles);
  const senior=/cấp cao|Trưởng|trưởng|Quản lý/u.test(title);
  const days=Math.floor(random()*4650)+5,start=new Date(TODAY-days*86_400_000);
  const startDate=`${start.getUTCFullYear()}-${pad(start.getUTCMonth()+1)}-${pad(start.getUTCDate())}`;
  const salary=Math.round(((senior?38:12)+random()*(senior?52:30))*10)*100_000;
  const roll=random(),status:EmployeeStatus=roll<0.12?'former':roll<0.19?'leave':days<60?'probation':'active';
  const phone=`09${Math.floor(random()*10)} ${String(Math.floor(random()*1000)).padStart(3,'0')} ${String(Math.floor(random()*1000)).padStart(3,'0')}`;
  rows.push({id:`NV-${10001+index}`,name,givenName,email,department:department.name,title,startDate,salary,status,manager:department.manager,location:pick(random,LOCATIONS),phone});
 }
 return rows;
}
let cache:readonly Employee[]|undefined;
/** 248 generated employees; computed on first use and shared afterwards. */
export function employees():readonly Employee[]{cache??=generate(248);return cache;}
export const STATUS_ORDER:readonly EmployeeStatus[]=['active','probation','leave','former'];
export const statusText:Record<EmployeeStatus,{vi:string;en:string;tone:'success'|'info'|'warning'|'neutral'}>={
 active:{vi:'Đang làm việc',en:'Active',tone:'success'},
 probation:{vi:'Thử việc',en:'Probation',tone:'info'},
 leave:{vi:'Nghỉ dài hạn',en:'On long leave',tone:'warning'},
 former:{vi:'Đã nghỉ việc',en:'Former employee',tone:'neutral'},
};

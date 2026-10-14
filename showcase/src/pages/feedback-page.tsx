import {useState} from 'react';
import {useToast} from '@sdcorejs/nova/toast';
import {useConfirm} from '@sdcorejs/nova/confirm';
import {Alert} from '@sdcorejs/nova/alert';
import {Button} from '@sdcorejs/nova/button';
import {Card} from '@sdcorejs/nova/card';
import {PageHeading,type Locale} from '../navigation.js';
export function FeedbackPage({locale}:{locale:Locale}){const t=(vi:string,en:string)=>locale==='vi'?vi:en,toast=useToast(),confirm=useConfirm(),[result,setResult]=useState('');return <><PageHeading title={t('Phản hồi vừa đủ.','Feedback that helps.')} intro={t('Thông báo có thể đóng bằng bàn phím và quyết định luôn rõ ràng.','Dismissible notifications and explicit decisions.')}/><Card className="showcase-demo"><Alert tone="tip" title={t('Bạn có thể thử trực tiếp','Try it here')}>{t('Các thao tác chỉ thay đổi bản mẫu đang mở.','Interactions only change this preview.')}</Alert><div className="showcase-demo-row"><Button onClick={()=>toast.show({title:t('Đã lưu bản mẫu','Preview saved'),description:t('Chỉ có hiệu lực trong trang đang mở.','Saved in this open page only.'),tone:'success'})}>{t('Hiện thông báo','Show notification')}</Button><Button variant="secondary" onClick={()=>{void confirm({title:t('Bỏ thay đổi bản mẫu?','Discard preview changes?'),description:t('Bạn có thể ở lại để tiếp tục chỉnh sửa.','You can stay and keep editing.'),tone:'danger'}).then(value=>setResult(value==='confirmed'?t('Đã xác nhận','Confirmed'):t('Đã hủy','Cancelled')));}}>{t('Yêu cầu xác nhận','Ask for confirmation')}</Button></div><p role="status">{result}</p></Card></>;}

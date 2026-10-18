import { renderToString } from 'react-dom/server';
import { expect,it } from 'vitest';
import { Calendar, DatePicker, DateRangePicker } from '../../src/components/date-picker/index.js';
import { NovaProvider } from '../../src/providers/nova/index.js';
it('F09 renders the same civil dates under different process timezones without opening a portal',()=>{
  const previous=process.env.TZ;
  const tree=<NovaProvider locale="vi"><Calendar label="Lịch" referenceDate="2024-02-29" defaultValue="2024-02-29"/><DatePicker label="Ngày" referenceDate="2024-02-29" defaultValue="2024-02-29"/><DateRangePicker label="Khoảng" referenceDate="2024-02-29"/></NovaProvider>;
  try {process.env.TZ='UTC';const html=renderToString(tree);process.env.TZ='Asia/Ho_Chi_Minh';expect(renderToString(tree)).toBe(html);expect(html).toContain('29/02/2024');expect(html).toContain('aria-current="date"');expect(html).not.toContain('role="dialog"');}
  finally {if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
});

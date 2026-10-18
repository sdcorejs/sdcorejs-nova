import { Calendar,DatePicker,DateRangePicker } from '@sdcorejs/nova/date-picker';
<Calendar label="Dates" referenceDate="2026-10-14" defaultValue={null}/>;
<DatePicker label="Date" referenceDate="2026-10-14" value={null} onValueChange={()=>{}} ref={node=>{node?.focus();}} name="date"/>;
<DateRangePicker label="Range" referenceDate="2026-10-14" names={{start:'start',end:'end'}}/>;
// @ts-expect-error explicit deterministic reference date required
<DatePicker label="Date"/>;
// @ts-expect-error range uses endpoint names instead of scalar name
<DateRangePicker label="Range" referenceDate="2026-10-14" name="range"/>;
// @ts-expect-error controlled values require callback
<DatePicker label="Date" referenceDate="2026-10-14" value={null}/>;
// @ts-expect-error Field owns required metadata
<DatePicker nameFromField required referenceDate="2026-10-14"/>;

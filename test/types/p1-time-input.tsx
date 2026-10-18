import {TimeInput,TimeRangeInput} from '@sdcorejs/nova/time-input';
import {DateTimePicker} from '@sdcorejs/nova/date-time-picker';
import {createTemporalAdapter} from '@sdcorejs/nova/adapters/temporal';
<TimeInput label="Time" value={null} onValueChange={()=>{}} precision="second" ref={node=>node?.focus()} form="form" onCompositionEnd={event=>event.currentTarget.value}/>;
<TimeRangeInput nameFromField names={{start:'start',end:'end'}} allowOvernight/>;
<DateTimePicker label="At" timeZone="UTC" referenceDate="2026-10-14" adapter={createTemporalAdapter()}/>;
// @ts-expect-error controlled requires callback
<TimeInput label="Time" value="10:00"/>;
// @ts-expect-error explicit names rather than a scalar JSON field
<TimeRangeInput label="Range" name="range"/>;
// @ts-expect-error zone and explicit adapter are required
<DateTimePicker label="At" referenceDate="2026-10-14"/>;
// @ts-expect-error Field owns error metadata
<TimeInput nameFromField error="Wrong"/>;

// case-p2-f11-ac01-types: public fixture; source projection is supplemental only.
import {CalendarChips,type CalendarChipsProps} from '@sdcorejs/nova/calendar-chips';
import type {ISODate} from '@sdcorejs/nova/types';
const days:readonly ISODate[]=['2024-02-29'];
<CalendarChips label="Days" referenceDate="2024-01-31" value={days} onValueChange={next=>{const dates:readonly ISODate[]=next;void dates;}} name="days"/>;
<CalendarChips label="Days" referenceDate="2024-01-31" defaultValue={days} maxDates={2} readOnly/>;
const props:CalendarChipsProps={nameFromField:true,referenceDate:'2024-01-31'};void props;
// @ts-expect-error deterministic referenceDate is required
<CalendarChips label="Days"/>;
// @ts-expect-error controlled state requires a callback
<CalendarChips label="Days" referenceDate="2024-01-31" value={days}/>;
// @ts-expect-error modes are mutually exclusive
<CalendarChips label="Days" referenceDate="2024-01-31" value={days} defaultValue={days} onValueChange={()=>{}}/>;
// @ts-expect-error an accessible name is mandatory
<CalendarChips referenceDate="2024-01-31"/>;
// @ts-expect-error dates preserve string civil identity
<CalendarChips label="Days" referenceDate="2024-01-31" defaultValue={[1]}/>;
// @ts-expect-error Field owns required metadata
<CalendarChips nameFromField required referenceDate="2024-01-31"/>;

import {createRef,type RefCallback} from 'react';
const rootRef=createRef<HTMLElement>(),primaryRef=createRef<HTMLElement>();
const cleanupRef:RefCallback<HTMLElement>=node=>{node?.getBoundingClientRect();return()=>{void node;};};
<CalendarChips label="Ref dates" referenceDate="2024-01-31" ref={rootRef} focusRef={primaryRef}/>;
<CalendarChips label="Readonly ref dates" referenceDate="2024-01-31" readOnly ref={cleanupRef} focusRef={cleanupRef}/>;
const refProps:CalendarChipsProps={label:'Refs',referenceDate:'2024-01-31',ref:rootRef,focusRef:primaryRef};void refProps;

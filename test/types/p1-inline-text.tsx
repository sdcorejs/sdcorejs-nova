import {InlineText} from '@sdcorejs/nova/inline-text';
<InlineText nameFromField name="title" form="edit" autoComplete="off" inputMode="text" ref={node=>node?.focus()} onCompositionEnd={event=>event.currentTarget.value} chrome="seamless" clearable/>;
// @ts-expect-error controlled string requires callback
<InlineText label="Title" value="x"/>;
// @ts-expect-error metadata belongs to Field
<InlineText nameFromField description="No"/>;
// @ts-expect-error native input has no raw onChange escape hatch
<InlineText label="Title" onChange={()=>{}}/>;

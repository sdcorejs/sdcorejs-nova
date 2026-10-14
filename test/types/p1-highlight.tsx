import {Highlight,findHighlightRanges} from '@sdcorejs/nova/highlight';
<Highlight text={0} term={null}/>;const ranges:readonly {start:number;end:number}[]=findHighlightRanges('Đặng','dang');void ranges;
// @ts-expect-error objects are not stringified
<Highlight text={{name:'An'}} term="an"/>;

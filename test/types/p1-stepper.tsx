import { Stepper, type Step } from '@sdcorejs/nova/stepper';
const steps:readonly Step[]=[{id:'first',label:'First',status:'pending'}];
<Stepper steps={steps} value="first" onValueChange={next=>{const id:string=next;void id;}} interactive/>;
<Stepper steps={steps} defaultValue="first" label="Progress"/>;
// @ts-expect-error controlled selection requires a callback
<Stepper steps={steps} value="first"/>;
// @ts-expect-error controlled and uncontrolled selection are exclusive
<Stepper steps={steps} value="first" defaultValue="first" onValueChange={()=>{}}/>;
// @ts-expect-error raw identity is a string, not an array index
<Stepper steps={steps} defaultValue={0}/>;
// @ts-expect-error statuses are consumer-owned supported values
<Stepper steps={[{id:'first',label:'First',status:'saved'}]}/>;
// @ts-expect-error each step requires stable identity
<Stepper steps={[{label:'First'}]}/>;

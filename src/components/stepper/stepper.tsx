'use client';
import { en } from '../../i18n/en.js';
import { cx } from '../../lib/cx.js';
import { Icon } from '../../lib/icons.js';
import { useControllableValue } from '../../lib/use-controllable-value.js';
import { useDiagnostics, useNovaScope } from '../../providers/nova/context.js';
import type { SurfaceProps, ValueProps } from '../../types/index.js';

export type Step={id:string;label:string;status?:'pending'|'complete'|'error';disabled?:boolean};
export type StepperProps=ValueProps<string>&SurfaceProps&{steps:readonly Step[];interactive?:boolean;label?:string};
export function Stepper({steps, interactive=false, label, value, defaultValue, onValueChange, className, style, 'data-testid':testId}:StepperProps){
  const {strings}=useNovaScope();
  const report=useDiagnostics('Stepper');
  const [current,setCurrent]=useControllableValue({value,defaultValue,onValueChange,fallback:steps.find(step=>!step.disabled)?.id??'',report});
  const statusText={pending:strings.navigation.stepPending??en.navigation.stepPending,complete:strings.navigation.stepComplete??en.navigation.stepComplete,error:strings.navigation.stepError??en.navigation.stepError};
  // eslint-disable-next-line jsx-a11y/no-redundant-roles -- Safari drops marker-free list semantics without an explicit list role.
  return <ol role="list" className={cx('nova-stepper',className)} style={style} data-testid={testId} aria-label={label??strings.navigation.steps??en.navigation.steps}>
    {steps.map((step,index)=>{
      const content=<><span className="nova-stepper__number" aria-hidden="true">{step.status==='complete'?<Icon name="check" className="nova-stepper__check"/>:index+1}</span><span className="nova-stepper__text"><span className="nova-stepper__label">{step.label}</span>{step.status&&<span className="nova-stepper__status">{statusText[step.status]}</span>}</span></>;
      return <li key={step.id} className="nova-stepper__step" data-status={step.status} aria-current={!interactive&&current===step.id?'step':undefined}>
        {interactive?<button type="button" className="nova-stepper__control" disabled={step.disabled} aria-current={current===step.id?'step':undefined} onClick={()=>{if(current!==step.id)setCurrent(step.id);}}>{content}</button>:<span className="nova-stepper__presentation">{content}</span>}
        {index<steps.length-1&&<span className="nova-stepper__connector" aria-hidden="true"/>}
      </li>;
    })}
  </ol>;
}

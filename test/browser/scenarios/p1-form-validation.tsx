import { useRef, useState, type FormEvent } from 'react';

import { Input } from '../../../src/components/input/index.js';
import { useFormValidation, type ValidationIssue } from '../../../src/hooks/form-validation/index.js';
import { NovaProvider } from '../../../src/providers/nova/index.js';

function Form() {
  const [name, setName] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState('');
  const work = useRef<{name: string; resolve: (issues: readonly ValidationIssue<'name'>[]) => void}[]>([]);
  const validation = useFormValidation<{name: string}>({
    createSnapshot: values => Object.freeze({...values}),
    validate: values => new Promise(resolve => {work.current.push({name: values.name, resolve});}),
  });
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const snapshot = {name};
    const result = await validation.validate(snapshot);
    setResults(current => [...current, result.status === 'cancelled' ? `cancelled:${result.reason}` : result.status]);
    if (result.status === 'validated' && result.issues.length === 0) setSubmitted(snapshot.name);
  };
  return <form aria-label="Validation form" aria-busy={validation.pending} onSubmit={event => {void submit(event);}}>
    <Input label="Tên" name="name" value={name} onValueChange={setName}/>
    <button type="submit">Validate</button>
    <button type="button" onClick={validation.cancel}>Cancel</button>
    <button type="button" onClick={validation.reset}>Reset</button>
    <button type="button" onClick={() => work.current[0]?.resolve([])}>Resolve first</button>
    <button type="button" onClick={() => work.current[1]?.resolve([])}>Resolve second</button>
    <output aria-label="Results">{results.join(',')}</output>
    <output aria-label="Submitted">{submitted}</output>
  </form>;
}

export default function FormValidationScenario() { return <NovaProvider locale="vi"><Form/></NovaProvider>; }

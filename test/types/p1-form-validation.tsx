import { useFormValidation, type ValidationIssue, type ValidationResult } from '@sdcorejs/nova/form-validation';

const issue: ValidationIssue<'name'> = {field: 'name', code: 'required', message: 'Required'};
// @ts-expect-error unknown fields are not accepted
const wrong: ValidationIssue<'name'> = {field: 'age', code: 'required', message: 'Required'};
void [issue, wrong];
function Form() {
  const state = useFormValidation<{name: string}>({createSnapshot: values => ({...values}), validate: () => [issue]});
  async function submit() {
    const result: ValidationResult<'name'> = await state.validate({name: ''});
    if (result.status === 'validated') return result.issues.length === 0;
    // @ts-expect-error cancelled/error outcomes cannot be treated as valid empty issues
    return result.issues.length === 0;
  }
  return <button onClick={() => {void submit();}}>Submit</button>;
}
void Form;

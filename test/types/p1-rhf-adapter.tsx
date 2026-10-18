import {useForm} from 'react-hook-form';
import {useNovaController} from '@sdcorejs/nova/adapters/react-hook-form';
import {Input,Checkbox} from '@sdcorejs/nova';
export function ControllerFixture(){const {control}=useForm<{name:string;agree:boolean|'mixed'}>();const name=useNovaController({control,name:'name'}),agree=useNovaController({control,name:'agree'});return <><Input {...name} label="Name"/><Checkbox {...agree} label="Agree"/></>;}
export function InvalidController(){const {control}=useForm<{name:string}>();
// @ts-expect-error field must belong to the declared form
useNovaController({control,name:'missing'});return null;}

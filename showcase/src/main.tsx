import '@sdcorejs/nova/tokens.css';
import '@sdcorejs/nova/styles.css';
import './showcase.css';
import {createRoot} from 'react-dom/client';
import {ShowcaseApp} from './app.js';
const host=document.getElementById('root');
if(!host)throw new Error('Missing showcase root');
createRoot(host).render(<ShowcaseApp/>);

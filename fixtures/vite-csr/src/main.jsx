import '@sdcorejs/nova/tokens.css';
import '@sdcorejs/nova/styles.css';
import './app.css';

import { createRoot } from 'react-dom/client';

import { App } from './app.jsx';

createRoot(document.getElementById('root')).render(<App />);

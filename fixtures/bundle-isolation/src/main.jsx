// Only the button subpath and its CSS are imported.
import '@sdcorejs/nova/tokens.css';
import '@sdcorejs/nova/styles/button.css';

import { Button } from '@sdcorejs/nova/button';
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('root')).render(<Button>Lưu</Button>);

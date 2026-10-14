import {Highlight} from '../../../src/components/highlight/index.js';
export default function Text(){return <div data-testid="text"><Highlight text="Đặng 👩‍💻 é <script>alert(1)</script>" term="dang"/><Highlight text={0} term="0"/></div>;}

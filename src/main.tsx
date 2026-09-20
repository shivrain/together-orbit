import {createRoot} from 'react-dom/client';
import Platform from './platform';
import './globals.css';
import './standalone.css';
createRoot(document.getElementById('root')!).render(<Platform/>);

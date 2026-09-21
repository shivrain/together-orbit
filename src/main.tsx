import {createRoot} from 'react-dom/client';
import Workspace from './workspace';
import './globals.css';
import './standalone.css';
createRoot(document.getElementById('root')!).render(<Workspace/>);

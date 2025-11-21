import React from 'react';
import ReactDOM from 'react-dom/client';
import { DesktopShell } from './components/DesktopShell';
import { MiffContentProvider } from './context/MiffContentContext';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <MiffContentProvider>
      <DesktopShell />
    </MiffContentProvider>
  </React.StrictMode>
);

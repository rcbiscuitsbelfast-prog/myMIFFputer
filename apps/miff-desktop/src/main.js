import React from 'react';
import ReactDOM from 'react-dom/client';
import { DesktopShell } from './components/DesktopShell';
import { MiffContentProvider } from './context/MiffContentContext';
import './styles.css';
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode>
    <MiffContentProvider>
      <DesktopShell />
    </MiffContentProvider>
  </React.StrictMode>);
//# sourceMappingURL=main.js.map
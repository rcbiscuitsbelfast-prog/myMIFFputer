import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import { DesktopShell } from './components/DesktopShell';
import { MiffContentProvider } from './context/MiffContentContext';
import './styles.css';
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(MiffContentProvider, { children: _jsx(DesktopShell, {}) }) }));

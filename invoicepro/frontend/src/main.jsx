import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { installChunkRecovery } from './utils/chunkRecovery';
import { initTheme } from './utils/theme';

installChunkRecovery();
initTheme();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

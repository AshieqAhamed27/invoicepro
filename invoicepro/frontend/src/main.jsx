import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { installChunkRecovery } from './utils/chunkRecovery';

const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
const app = <App />;

installChunkRecovery();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>
        {app}
      </GoogleOAuthProvider>
    ) : (
      app
    )}
  </React.StrictMode>
);

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { GoogleOAuthProvider } from '@react-oauth/google';

ReactDOM.createRoot(document.getElementById('root')).render(
  
    <GoogleOAuthProvider clientId="251597134759-nfkq6fmlnvsgn8lniia3colbfer62gum.apps.googleusercontent.com">
      <App />
    </GoogleOAuthProvider>
  
);
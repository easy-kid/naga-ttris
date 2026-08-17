import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App from './App.tsx';
import './index.css';

// Ensure Capacitor object is globally available for native bridge event triggers
if (typeof window !== 'undefined') {
  (window as any).Capacitor = (window as any).Capacitor || Capacitor;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);


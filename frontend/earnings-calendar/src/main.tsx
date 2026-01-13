import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './app/store';
import App from './App';

// Global error handler to suppress browser extension errors during OAuth
window.addEventListener('error', (event) => {
  // Suppress "Cannot respond" errors that are likely from browser extensions
  if (event.message && event.message.includes('Cannot respond')) {
    console.warn('Suppressed browser extension error:', event.message);
    event.preventDefault();
    return false;
  }
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  // Suppress "Cannot respond" errors that are likely from browser extensions
  if (event.reason && typeof event.reason === 'string' && event.reason.includes('Cannot respond')) {
    console.warn('Suppressed browser extension promise rejection:', event.reason);
    event.preventDefault();
    return false;
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
);

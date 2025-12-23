
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const mount = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error("Critical: #root element not found");
    return;
  }

  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    // Hide loader immediately after mounting call
    // React 18+ renders are concurrent, but the 'novacast-ready' 
    // event inside App.tsx is a better signal for "fully interactive".
    // We keep the listener but also ensure a basic cleanup here.
    window.addEventListener('novacast-ready', () => {
      const loader = document.getElementById('loader');
      if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 500);
      }
    });
  } catch (err) {
    console.error("Rendering failed during mount:", err);
  }
};

mount();

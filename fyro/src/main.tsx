import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import './i18n';
import { App } from './app/App';
import { startMocks } from './mocks/browser';
import { applyTheme, useUI } from './store';

applyTheme(useUI.getState().theme);

startMocks()
  .catch((e) => console.warn('Mock API failed to start', e))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App, AppErrorBoundary } from './App.tsx';
import './styles.css';

const root = document.querySelector('#root');
if (root === null) throw new Error('Renderer root is missing.');

createRoot(root).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);

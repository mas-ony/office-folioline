import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@folioline/react/style.css';
import '@folioline/web-shared/app.css';
import { App } from './App';
import { registerServiceWorker, shellOptions } from '@folioline/web-shared/shell';

void shellOptions().then((options) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App options={options} />
    </StrictMode>,
  );
});

if (import.meta.env.PROD) registerServiceWorker();

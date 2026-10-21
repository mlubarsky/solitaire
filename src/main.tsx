import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './ui/styles/base.css';
import './ui/styles/cards.css';
import './ui/styles/dialogs.css';
import './ui/styles/settings.css';
import './ui/styles/title.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

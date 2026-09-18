import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import './bento.css';
import { BentoApp } from './BentoApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BentoApp />
  </StrictMode>,
);

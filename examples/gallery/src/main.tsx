import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import './gallery.css';
import { Theme } from '@astryxdesign/core/theme';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { galleryTheme } from './gallery.js';

const root = document.getElementById('root');
if (!root) throw new Error('index.html has no #root element');

createRoot(root).render(
  <StrictMode>
    <Theme theme={galleryTheme}>
      <App />
    </Theme>
  </StrictMode>,
);

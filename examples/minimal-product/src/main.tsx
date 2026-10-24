import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import './example.css';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { Theme } from '@astryxdesign/core/theme';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { exampleTheme } from './example.js';

const root = document.getElementById('root');
if (!root) throw new Error('index.html has no #root element');

createRoot(root).render(
  <StrictMode>
    <Theme theme={exampleTheme}>
      <Center minHeight="100vh">
        <Button label="Hello from venture-ui" variant="primary" />
      </Center>
    </Theme>
  </StrictMode>,
);

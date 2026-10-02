import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { devTierNameFromUrl } from './dev/devTier';
import { qualityStore } from './quality/qualityStore';
import './styles.css';

// Before the first render, so a bench run measures the requested tier from its first frame; never stored, so the
// next load is back on the viewer's own choice.
const devTierName = import.meta.env.DEV ? devTierNameFromUrl(window.location.search) : undefined;
if (devTierName) qualityStore.setPreferenceForThisLoad(devTierName);

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Missing #root element in index.html');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

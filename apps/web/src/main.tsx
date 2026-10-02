import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { devTierNameFromUrl } from './dev/devTier';
import { webGlForcedOffFromUrl } from './dev/devWebGl';
import { qualityStore } from './quality/qualityStore';
import { NoWebGlNotice } from './shell/NoWebGlNotice';
import { hasWebGl2 } from './shell/webglSupport';
import './styles.css';

// Before the first render, so a bench run measures the requested tier from its first frame; never stored, so the
// next load is back on the viewer's own choice.
const devTierName = import.meta.env.DEV ? devTierNameFromUrl(window.location.search) : undefined;
if (devTierName) qualityStore.setPreferenceForThisLoad(devTierName);

// Checked before the app mounts, so a browser without WebGL2 never creates the scene's canvas or context.
const webGlForcedOff = import.meta.env.DEV && webGlForcedOffFromUrl(window.location.search);
const canRenderScene = !webGlForcedOff && hasWebGl2(() => document.createElement('canvas'));

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Missing #root element in index.html');

createRoot(rootElement).render(
  <StrictMode>{canRenderScene ? <App /> : <NoWebGlNotice />}</StrictMode>,
);

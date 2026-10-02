import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('puts the scene in the main landmark, with the header and footer outside it', () => {
    const markup = renderToStaticMarkup(
      <AppShell top="top" bottom="bottom">
        <canvas />
      </AppShell>,
    );
    expect(markup).toMatch(/^<main class="shell-scene"><canvas><\/canvas><\/main>/);
    expect(markup.match(/<main/g)).toHaveLength(1);
    expect(markup).toMatch(/<\/main>.*<header class="shell-top">top<\/header>.*<footer/);
  });
});

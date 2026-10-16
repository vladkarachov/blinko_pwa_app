// Single source of truth for the displayed app version.
// Injected at build time from package.json (see vite.config.ts `define`).
declare const __APP_VERSION__: string | undefined;

export const APP_VERSION: string =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.1.0';

export const RELEASES_URL = 'https://github.com/vladkarachov/blinko_pwa_app/releases';

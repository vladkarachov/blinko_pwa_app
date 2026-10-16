import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.blinko.offline',
  appName: 'Blinko',
  webDir: 'dist',
  backgroundColor: '#0f172a',
  android: {
    allowMixedContent: true,
  },
  server: {
    androidScheme: 'https',
    cleartext: true,
    // Self-hosted servers live on arbitrary LAN hosts; allow the WebView
    // to navigate/fetch them and their /api/file/* attachments directly.
    allowNavigation: ['*'],
  },
};

export default config;

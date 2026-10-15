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
  },
};

export default config;

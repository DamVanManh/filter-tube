import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'vn.kenhcuame.app',
  appName: 'Kênh của Mẹ',
  webDir: 'dist/momtube/browser',
  android: {
    backgroundColor: '#0a0a0a',
  },
  plugins: {
    CapacitorHttp: { enabled: false },
  },
};

export default config;

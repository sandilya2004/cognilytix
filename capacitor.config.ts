import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.fbb87607493049708aa6030cb9c65ba3',
  appName: 'cognilytix',
  webDir: 'dist',
  // Development device preview only; remove server before store release.
  server: {
    url: 'https://fbb87607-4930-4970-8aa6-030cb9c65ba3.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;

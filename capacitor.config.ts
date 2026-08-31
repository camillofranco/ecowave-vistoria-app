import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ecowave.vistoria',
  appName: 'EcoWave Vistoria',
  webDir: 'dist',
  server: {
    url: 'https://camillofranco.github.io/ecowave-vistoria-app/',
    cleartext: true
  }
};

export default config;

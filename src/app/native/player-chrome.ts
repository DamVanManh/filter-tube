import { registerPlugin } from '@capacitor/core';

interface PlayerChromePlugin {
  enterFullscreen(): Promise<void>;
  exitFullscreen(): Promise<void>;
}

const nativePlayerChrome = registerPlugin<PlayerChromePlugin>('PlayerChrome', {
  web: {
    enterFullscreen: async () => {
      await document.documentElement.requestFullscreen?.().catch(() => undefined);
    },
    exitFullscreen: async () => {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
    },
  },
});

export async function enterDeviceFullscreen(): Promise<void> {
  try {
    await nativePlayerChrome.enterFullscreen();
  } catch {}
}

export async function exitDeviceFullscreen(): Promise<void> {
  try {
    await nativePlayerChrome.exitFullscreen();
  } catch {}
}

/**
 * Provider-aware video service router.
 * Reads `provider` from localStorage and delegates to the right backend.
 */
import * as veo from './veoService';
import * as seedance from './bytedanceVideoService';

function getSettings(): { provider: 'google' | 'bytedance'; googleEnabled: boolean; bytedanceEnabled: boolean } {
  try {
    const saved = localStorage.getItem('studioSettings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        provider: parsed.provider ?? 'google',
        googleEnabled: parsed.googleEnabled !== false,
        bytedanceEnabled: parsed.bytedanceEnabled !== false,
      };
    }
  } catch {}
  return { provider: 'google', googleEnabled: true, bytedanceEnabled: true };
}

function getProvider(): 'google' | 'bytedance' {
  return getSettings().provider;
}

export function generateVideo(
  ...args: Parameters<typeof veo.generateVideo>
): ReturnType<typeof veo.generateVideo> {
  const { provider, googleEnabled, bytedanceEnabled } = getSettings();
  if (provider === 'bytedance') {
    if (!bytedanceEnabled) throw new Error('ByteDance provider is disabled. Enable it in Settings → AI Provider.');
    return seedance.generateVideo(...args);
  }
  if (!googleEnabled) throw new Error('Google provider is disabled. Enable it in Settings → AI Provider.');
  return veo.generateVideo(...args);
}

export function pollVideoOperation(
  ...args: Parameters<typeof veo.pollVideoOperation>
): ReturnType<typeof veo.pollVideoOperation> {
  if (getProvider() === 'bytedance') {
    return seedance.pollVideoOperation(...args);
  }
  return veo.pollVideoOperation(...args);
}

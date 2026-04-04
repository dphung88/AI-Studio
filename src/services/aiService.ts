/**
 * Provider-aware AI service router.
 * Reads `provider` from localStorage and delegates to Gemini or Seed 2.0.
 */
import * as gemini from './geminiService';
import * as seed from './seedService';

function getProvider(): 'google' | 'bytedance' {
  try {
    const saved = localStorage.getItem('studioSettings');
    if (saved) return JSON.parse(saved).provider ?? 'google';
  } catch {}
  return 'google';
}

function assertProviderEnabled() {
  try {
    const saved = localStorage.getItem('studioSettings');
    if (saved) {
      const s = JSON.parse(saved);
      const provider = s.provider ?? 'google';
      if (provider === 'google' && s.googleEnabled === false) {
        throw new Error('Google provider is disabled. Enable it in Settings → AI Provider, or switch to ByteDance.');
      }
      if (provider === 'bytedance' && s.bytedanceEnabled === false) {
        throw new Error('ByteDance provider is disabled. Enable it in Settings → AI Provider, or switch to Google.');
      }
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes('provider is disabled')) throw e;
  }
}

export function generateAutoScript(
  ...args: Parameters<typeof gemini.generateAutoScript>
): ReturnType<typeof gemini.generateAutoScript> {
  assertProviderEnabled();
  return getProvider() === 'bytedance'
    ? seed.generateAutoScript(...args)
    : gemini.generateAutoScript(...args);
}

export function generateScriptFromVideo(
  ...args: Parameters<typeof gemini.generateScriptFromVideo>
): ReturnType<typeof gemini.generateScriptFromVideo> {
  assertProviderEnabled();
  return getProvider() === 'bytedance'
    ? seed.generateScriptFromVideo(...args)
    : gemini.generateScriptFromVideo(...args);
}

export function extractFrames(
  ...args: Parameters<typeof gemini.extractFrames>
): ReturnType<typeof gemini.extractFrames> {
  assertProviderEnabled();
  return getProvider() === 'bytedance'
    ? seed.extractFrames(...args)
    : gemini.extractFrames(...args);
}

export function regeneratePromptsFromCharacters(
  ...args: Parameters<typeof gemini.regeneratePromptsFromCharacters>
): ReturnType<typeof gemini.regeneratePromptsFromCharacters> {
  assertProviderEnabled();
  return getProvider() === 'bytedance'
    ? seed.regeneratePromptsFromCharacters(...args)
    : gemini.regeneratePromptsFromCharacters(...args);
}

export function improveScenePrompt(
  ...args: Parameters<typeof gemini.improveScenePrompt>
): ReturnType<typeof gemini.improveScenePrompt> {
  assertProviderEnabled();
  return getProvider() === 'bytedance'
    ? seed.improveScenePrompt(...args)
    : gemini.improveScenePrompt(...args);
}

export function generateImage(
  ...args: Parameters<typeof gemini.generateImage>
): ReturnType<typeof gemini.generateImage> {
  assertProviderEnabled();
  return getProvider() === 'bytedance'
    ? seed.generateImage(...args)
    : gemini.generateImage(...args);
}

export function generateSpeech(
  ...args: Parameters<typeof gemini.generateSpeech>
): ReturnType<typeof gemini.generateSpeech> {
  assertProviderEnabled();
  return getProvider() === 'bytedance'
    ? seed.generateSpeech(...args)
    : gemini.generateSpeech(...args);
}

export function analyzeVideoScenes(
  ...args: Parameters<typeof gemini.analyzeVideoScenes>
): ReturnType<typeof gemini.analyzeVideoScenes> {
  assertProviderEnabled();
  return getProvider() === 'bytedance'
    ? seed.analyzeVideoScenes(...args)
    : gemini.analyzeVideoScenes(...args);
}


export const getLlmModel = () => {
  const saved = localStorage.getItem('studioSettings');
  if (saved) {
    try {
      const settings = JSON.parse(saved);
      return settings.llmModel || 'gemini-2.5-flash';
    } catch (e) {
      return 'gemini-2.5-flash';
    }
  }
  return 'gemini-2.5-flash';
};

export const getApiKey = () => {
  const saved = localStorage.getItem('studioSettings');
  let key = '';

  if (saved) {
    try {
      const settings = JSON.parse(saved);
      if (settings.customApiKey) {
        key = settings.customApiKey;
      }
    } catch (e) {
      console.error('Error parsing studioSettings', e);
    }
  }

  if (!key) {
    // Vite exposes env vars via import.meta.env (not process.env)
    const env = import.meta.env as Record<string, string | undefined>;
    key = env.VITE_API_KEY || env.VITE_GEMINI_API_KEY || '';
  }

  return key.trim();
};

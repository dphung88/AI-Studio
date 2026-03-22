
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

  // No env-var fallback — users must provide their own key via Settings.
  // Falling back to a shared/owner key would charge their billing.

  return key.trim();
};

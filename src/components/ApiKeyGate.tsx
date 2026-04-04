import React, { useState } from 'react';
import { KeyRound, ExternalLink, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export function ApiKeyGate({ children }: { children: React.ReactNode }) {
  const { provider, setProvider, customApiKey, setCustomApiKey, arkApiKey, setArkApiKey } = useSettings();
  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const isGoogle = provider === 'google';
  const activeKey = isGoogle ? customApiKey : arkApiKey;

  // If key already saved for active provider → render the app
  if (activeKey && activeKey.trim().length > 0) {
    return <>{children}</>;
  }

  const handleSave = async () => {
    const trimmed = inputKey.trim();
    if (!trimmed) {
      setError('Please enter a valid API key.');
      return;
    }

    setIsValidating(true);
    setError('');

    if (isGoogle) {
      if (!trimmed.startsWith('AIza')) {
        setError('This does not look like a Google AI API key. It should start with "AIza".');
        setIsValidating(false);
        return;
      }
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${trimmed}`,
          { method: 'GET' }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(`Invalid key or quota issue: ${data?.error?.message || `HTTP ${res.status}`}`);
          setIsValidating(false);
          return;
        }
      } catch {
        setError('Network error while validating. Please check your connection.');
        setIsValidating(false);
        return;
      }
      setCustomApiKey(trimmed);
    } else {
      try {
        const res = await fetch('https://ark.ap-southeast.bytepluses.com/api/v3/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${trimmed}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'seed-2-0-lite-260228',
            messages: [{ role: 'user', content: 'Hello' }],
            max_tokens: 5,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(`Invalid key or error: ${data?.error?.message || `HTTP ${res.status}`}`);
          setIsValidating(false);
          return;
        }
      } catch {
        setError('Network error while validating. Please check your connection.');
        setIsValidating(false);
        return;
      }
      setArkApiKey(trimmed);
    }

    setIsValidating(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-950 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-cyan-500 p-2.5 rounded-xl">
            <KeyRound className="w-6 h-6 text-black" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-zinc-500">AXIOM LLC</p>
            <h1 className="text-xl font-black text-white tracking-tight">AI STUDIO</h1>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          {/* Provider selector pills */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setProvider('google'); setInputKey(''); setError(''); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all ${
                isGoogle
                  ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400'
              }`}
            >
              <img src="https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png" alt="Google" className="w-3.5 h-3.5" />
              Google
            </button>
            <button
              onClick={() => { setProvider('bytedance'); setInputKey(''); setError(''); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all ${
                !isGoogle
                  ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400'
              }`}
            >
              <span className="text-sm leading-none">火</span>
              ByteDance
            </button>
          </div>

          <h2 className="text-white font-black text-xl mb-1">
            {isGoogle ? 'Google AI API Key Required' : 'BytePlus ARK API Key Required'}
          </h2>
          <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
            {isGoogle
              ? <>Enter your <strong className="text-white">Google AI (Gemini) API key</strong>. Your key is stored locally and never sent to our servers.</>
              : <>Enter your <strong className="text-white">BytePlus ModelArk API key</strong>. Your key is stored locally and never sent to our servers.</>
            }
          </p>

          <div className="relative mb-3">
            <input
              type={showKey ? 'text' : 'password'}
              value={inputKey}
              onChange={e => { setInputKey(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown}
              placeholder={isGoogle ? 'AIza...' : 'Paste your ARK API key here...'}
              className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-cyan-500 transition-colors font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-red-400 text-xs mb-3 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={isValidating || !inputKey.trim()}
            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-black uppercase tracking-widest text-sm py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
          >
            {isValidating ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Validating...</>
            ) : (
              <><CheckCircle className="w-4 h-4" />Save & Enter Studio</>
            )}
          </button>

          <div className="border-t border-zinc-800 my-5" />

          <div className="space-y-3">
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">How to get a key</p>
            {isGoogle ? (
              <>
                <ol className="text-zinc-400 text-xs space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Go to <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline">Google AI Studio → API Keys</a></li>
                  <li>Click <strong className="text-white">"Create API key"</strong></li>
                  <li>Copy and paste it above</li>
                </ol>
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-xs font-semibold transition-colors mt-2">
                  <ExternalLink className="w-3.5 h-3.5" />Open Google AI Studio
                </a>
              </>
            ) : (
              <>
                <ol className="text-zinc-400 text-xs space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Go to <a href="https://console.byteplus.com/ark/region:ark+ap-southeast-1/apiKey" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline">BytePlus ModelArk Console → API Keys</a></li>
                  <li>Click <strong className="text-white">"Create API Key"</strong></li>
                  <li>Copy and paste it above</li>
                </ol>
              </>
            )}
          </div>

        </div>

        <p className="text-center text-zinc-600 text-xs mt-4">
          Your key is only stored in your browser's localStorage. No backend, no tracking.
        </p>
      </div>
    </div>
  );
}

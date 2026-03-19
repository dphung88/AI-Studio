import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export function ApiKeyGate({ children }: { children: React.ReactNode }) {
  const [isChecking, setIsChecking] = useState(true);
  const { customApiKey } = useSettings();

  useEffect(() => {
    const checkKey = async () => {
      try {
        // Just a small delay to simulate checking or ensure context is ready
        await new Promise(resolve => setTimeout(resolve, 500));
        setIsChecking(false);
      } catch (e) {
        console.error(e);
        setIsChecking(false);
      }
    };
    checkKey();
  }, []);

  if (isChecking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-950 text-zinc-200">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  // We no longer block access even if no key is found
  // Users can enter key in Settings
  return <>{children}</>;
}

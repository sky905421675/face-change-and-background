import React, { useEffect, useState } from 'react';
import { Button } from './Button';
import '../types'; // Ensure types are loaded

interface ApiKeyGuardProps {
  children: React.ReactNode;
}

export const ApiKeyGuard: React.FC<ApiKeyGuardProps> = ({ children }) => {
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const checkKey = async () => {
    if (window.aistudio?.hasSelectedApiKey) {
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasKey(selected);
    } else {
      // Fallback for dev environments without the special window object, 
      // assume true if manual env var is set, or just bypass for UI dev
      setHasKey(!!process.env.API_KEY); 
    }
    setLoading(false);
  };

  useEffect(() => {
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      try {
        await window.aistudio.openSelectKey();
        // Assume success after dialog interaction (race condition mitigation)
        setHasKey(true);
      } catch (e) {
        console.error("Failed to select key", e);
      }
    } else {
      alert("API Key selection not supported in this environment.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="animate-pulse">Checking permissions...</div>
      </div>
    );
  }

  if (!hasKey) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="w-16 h-16 bg-banana-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-banana-500">
             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Banana Studio Pro</h1>
          <p className="text-slate-400 mb-6">
            To use the high-fidelity Gemini 3.0 models for image generation and remixing, please select a paid API key.
          </p>
          <Button onClick={handleSelectKey} className="w-full">
            Select API Key
          </Button>
          <p className="mt-4 text-xs text-slate-500">
            For more info on billing, visit <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-banana-500 hover:underline">Gemini API Billing</a>.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

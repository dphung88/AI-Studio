export {};

export type AspectRatio = '16:9' | '9:16';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }

  namespace NodeJS {
    interface ProcessEnv {
      API_KEY?: string;
      GEMINI_API_KEY?: string;
    }
  }
}

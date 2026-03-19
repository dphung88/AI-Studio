import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { generateVideo, pollVideoOperation } from '../services/veoService';
import { concatVideos } from '../services/videoAssemblyService';
import { useSettings } from './SettingsContext';
import { v4 as uuidv4 } from 'uuid';
import { AspectRatio } from '../types';

export interface StoryScene {
  id: string;
  prompt: string;
  image?: { data: string; mimeType: string; url: string };
  url?: string;
  loading: boolean;
  error?: string;
  status?: 'queued' | 'processing' | 'done' | 'error';
}

export interface StoryBuilderState {
  scenes: StoryScene[];
  isAssembling: boolean;
  assemblyProgress: number;
  assemblyError: string | null;
  finalVideo: string | null;
  aspectRatio: AspectRatio;
  veoModel: string;
  logs: {time: string, message: string, type: 'info' | 'success' | 'error'}[];
  isSequentialLoopRunning: boolean;
  currentGenerationId: number;
}

const initialState: StoryBuilderState = {
  scenes: [{ id: uuidv4(), prompt: '', loading: false, status: 'queued' }],
  isAssembling: false,
  assemblyProgress: 0,
  assemblyError: null,
  finalVideo: null,
  aspectRatio: '16:9',
  veoModel: 'veo-3.1-fast-generate-preview',
  logs: [],
  isSequentialLoopRunning: false,
  currentGenerationId: 0,
};

// Background tasks map to survive unmounts
const activeTasks = new Map<string, boolean>();

interface StoryBuilderContextType extends StoryBuilderState {
  setAspectRatio: (ratio: AspectRatio) => void;
  setVeoModel: (model: string) => void;
  addScene: () => void;
  removeScene: (id: string) => void;
  updateScenePrompt: (id: string, prompt: string) => void;
  handleImageUpload: (id: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  generateSceneVideo: (sceneId: string) => void;
  assembleVideo: () => Promise<void>;
  reset: () => void;
  addLog: (message: string, type?: 'info' | 'success' | 'error') => void;
  clearLogs: () => void;
}

const StoryBuilderContext = createContext<StoryBuilderContextType | undefined>(undefined);

export const StoryBuilderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { defaultModel, defaultAspectRatio } = useSettings();
  const [state, setState] = useState<StoryBuilderState>({
    ...initialState,
    aspectRatio: (defaultAspectRatio as AspectRatio) || '16:9',
    veoModel: defaultModel || 'veo-3.1-fast-generate-preview'
  });
  const [isLoaded, setIsLoaded] = useState(false);
  
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('storyBuilderState');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        let hasPendingVideos = false;
        if (parsed.scenes && parsed.scenes.length > 0) {
          hasPendingVideos = parsed.scenes.some((s: StoryScene) => s.loading && !s.url && !s.error);
        }

        setState(prev => {
          const newState = { 
            ...prev, 
            ...parsed, 
            isAssembling: false 
          };
          stateRef.current = newState;
          return newState;
        });

        // Resume queue if there were pending tasks
        if (hasPendingVideos) {
          setTimeout(() => processQueue(), 1000);
        }
      } catch (e) {
        console.error('Failed to parse storyBuilder state', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (isLoaded) {
      // Don't save image data to avoid QuotaExceededError in localStorage if base64 is too large
      const stateToSave = { ...state };
      stateToSave.scenes = state.scenes.map(s => {
        const { image, ...rest } = s;
        return rest;
      });
      localStorage.setItem('storyBuilderState', JSON.stringify(stateToSave));
    }
  }, [state, isLoaded]);

  const updateState = (updates: Partial<StoryBuilderState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      stateRef.current = newState;
      return newState;
    });
  };

  const addLog = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setState(prev => ({
      ...prev,
      logs: [...prev.logs, { time: new Date().toLocaleTimeString(), message, type }]
    }));
  }, []);

  const clearLogs = useCallback(() => {
    updateState({ logs: [] });
  }, []);

  const addScene = useCallback(() => {
    setState(prev => ({
      ...prev,
      scenes: [...prev.scenes, { id: uuidv4(), prompt: '', loading: false, status: 'queued' }]
    }));
  }, []);

  const removeScene = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      scenes: prev.scenes.filter(s => s.id !== id)
    }));
  }, []);

  const updateScenePrompt = useCallback((id: string, prompt: string) => {
    setState(prev => ({
      ...prev,
      scenes: prev.scenes.map(s => s.id === id ? { ...s, prompt } : s)
    }));
  }, []);

  const handleImageUpload = useCallback((id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const base64Data = dataUrl.split(',')[1];
      setState(prev => ({
        ...prev,
        scenes: prev.scenes.map(s => s.id === id ? {
          ...s,
          image: { data: base64Data, mimeType: file.type, url: dataUrl }
        } : s)
      }));
    };
    reader.readAsDataURL(file);
  }, []);

  // Internal retry wrapper
  const generateWithRetry = async (prompt: string, image: any, aspectRatio: AspectRatio, model: string, maxRetries = 5) => {
    let attempt = 0;
    const backoffDelays = [25000, 45000, 70000, 120000, 180000];

    while (attempt <= maxRetries) {
      try {
        const operation = await generateVideo(prompt, image, undefined, aspectRatio, '720p', model);
        const url = await pollVideoOperation(operation);
        return url;
      } catch (error: any) {
        console.error(`Generation failed (Attempt ${attempt + 1}/${maxRetries + 1}):`, error);
        
        const errorMsg = error?.message?.toLowerCase() || (typeof error === 'string' ? error.toLowerCase() : '');
        const isQuotaError = errorMsg.includes('quota') || errorMsg.includes('429') || error?.status === 429 || error?.code === 429 || errorMsg.includes('too many requests');

        if (attempt === maxRetries) {
          throw new Error(isQuotaError ? "API Quota exceeded after multiple retries." : errorMsg);
        }

        const delay = isQuotaError ? backoffDelays[attempt] : 5000;
        if (isQuotaError) {
          addLog(`System rate limit reached. Retrying in ${delay/1000}s...`, 'info');
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
      }
    }
    throw new Error('Max retries exceeded');
  };

  const processQueue = async () => {
    const currentState = stateRef.current;
    if (currentState.isSequentialLoopRunning) return;
    
    updateState({ isSequentialLoopRunning: true });
    const myGenerationId = currentState.currentGenerationId;

    try {
      while (true) {
        if (myGenerationId !== stateRef.current.currentGenerationId) break;

        // Find next scene to process
        let sceneToProcessId: string | null = null;
        for (const scene of stateRef.current.scenes) {
          if (scene.status === 'queued' || (scene.loading && !scene.url && !scene.error && scene.status !== 'error')) {
            sceneToProcessId = scene.id;
            break;
          }
        }

        if (!sceneToProcessId) {
          updateState({ isSequentialLoopRunning: false });
          break; // Queue empty
        }

        const scene = stateRef.current.scenes.find(s => s.id === sceneToProcessId)!;
        const taskKey = `story-${sceneToProcessId}`;
        activeTasks.set(taskKey, true);

        setState(prev => ({
          ...prev,
          scenes: prev.scenes.map(s => s.id === sceneToProcessId ? { ...s, loading: true, status: 'processing', error: undefined, url: undefined } : s)
        }));

        try {
          const url = await generateWithRetry(scene.prompt, scene.image, stateRef.current.aspectRatio, stateRef.current.veoModel);
          if (myGenerationId !== stateRef.current.currentGenerationId || !activeTasks.has(taskKey)) return; 
          
          addLog(`Scene synthesized successfully!`, 'success');
          setState(prev => ({
            ...prev,
            scenes: prev.scenes.map(s => s.id === sceneToProcessId ? { ...s, loading: false, status: 'done', url } : s)
          }));

        } catch (error: any) {
          if (myGenerationId !== stateRef.current.currentGenerationId || !activeTasks.has(taskKey)) return; 
          
          const errorMessage = error?.message || 'Generation failed';
          addLog(`Error: ${errorMessage}`, 'error');
          setState(prev => ({
            ...prev,
            scenes: prev.scenes.map(s => s.id === sceneToProcessId ? { ...s, loading: false, status: 'error', error: errorMessage } : s)
          }));
        } finally {
          activeTasks.delete(taskKey);
        }
        
        if (myGenerationId !== stateRef.current.currentGenerationId) break;
        // Delay between scenes to protect quota
        await new Promise(resolve => setTimeout(resolve, 25000));
      }
    } finally {
      if (myGenerationId === stateRef.current.currentGenerationId) {
        updateState({ isSequentialLoopRunning: false });
      }
    }
  };

  const generateSceneVideo = useCallback((sceneId: string) => {
    const sceneIndex = stateRef.current.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1 || !stateRef.current.scenes[sceneIndex].prompt) return;

    addLog(`Added Scene to generation queue...`, 'info');
    setState(prev => ({
      ...prev,
      scenes: prev.scenes.map(s => s.id === sceneId ? { ...s, loading: false, status: 'queued', error: undefined, url: undefined } : s)
    }));

    if (!stateRef.current.isSequentialLoopRunning) {
      setTimeout(processQueue, 500);
    }
  }, []);

  const assembleVideo = useCallback(async () => {
    const selectedUrls = stateRef.current.scenes.filter(s => s.url).map(s => ({ 
      videoUrl: s.url!,
      audioUrl: s.url // Veo videos have audio embedded in the same URL
    }));
    if (selectedUrls.length === 0) return;

    updateState({ isAssembling: true, assemblyProgress: 0, assemblyError: null });
    addLog(`Starting video assembly with ${selectedUrls.length} clips...`, 'info');
    
    try {
      const finalUrl = await concatVideos(selectedUrls, (progress) => {
        updateState({ assemblyProgress: Math.round(progress * 100) });
      });
      updateState({ finalVideo: finalUrl, isAssembling: false, assemblyProgress: 100 });
      addLog('Video assembled successfully.', 'success');
    } catch (error: any) {
      console.error('Failed to assemble video:', error);
      updateState({ isAssembling: false, assemblyError: error.message || 'Unknown error during assembly' });
      addLog(`Assembly error: ${error.message || 'Unknown error'}`, 'error');
    }
  }, []);

  const reset = useCallback(() => {
    const newGenId = stateRef.current.currentGenerationId + 1;
    setState({
      ...initialState,
      currentGenerationId: newGenId,
      aspectRatio: stateRef.current.aspectRatio,
      veoModel: stateRef.current.veoModel
    });
    localStorage.removeItem('storyBuilderState');
    activeTasks.clear();
  }, []);

  return (
    <StoryBuilderContext.Provider value={{
      ...state,
      setAspectRatio: (aspectRatio) => updateState({ aspectRatio }),
      setVeoModel: (veoModel) => updateState({ veoModel }),
      addScene,
      removeScene,
      updateScenePrompt,
      handleImageUpload,
      generateSceneVideo,
      assembleVideo,
      reset,
      addLog,
      clearLogs
    }}>
      {children}
    </StoryBuilderContext.Provider>
  );
};

export const useStoryBuilder = () => {
  const context = useContext(StoryBuilderContext);
  if (!context) throw new Error('useStoryBuilder must be used within StoryBuilderProvider');
  return context;
};

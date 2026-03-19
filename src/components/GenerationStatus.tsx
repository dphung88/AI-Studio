import React from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  List, 
  LayoutGrid, 
  ListOrdered, 
  RotateCcw,
  RefreshCw,
  Video
} from 'lucide-react';

interface GenerationStatusProps {
  total: number;
  sent: number;
  done: number;
  error: number;
  progress: number;
  activeTab?: string;
  onTabChange?: (tab: any) => void;
  tabs?: { id: string; label: string; icon: any }[];
}

export function GenerationStatus({ 
  total, 
  sent, 
  done, 
  error, 
  progress,
  activeTab,
  onTabChange,
  tabs = []
}: GenerationStatusProps) {
  return (
    <div className="bg-zinc-950/50 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 mb-8 shadow-2xl relative overflow-hidden group">
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-8">
          <div className="space-y-1">
            <h2 className="text-3xl font-black italic text-white tracking-tighter uppercase">
              System <span className="text-cyan-500">Status</span>
            </h2>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.2em]">Real-time Generation Monitor</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 bg-zinc-900/50 p-1.5 rounded-2xl border border-white/5">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl transition-all duration-300 ${
                    active 
                      ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20 font-black' 
                      : 'text-zinc-500 hover:text-zinc-300 font-bold'
                  } uppercase tracking-wider text-[11px]`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-black' : 'text-zinc-600'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress Section */}
        <div className="mb-10">
          <div className="flex justify-between items-end mb-3 px-1">
            <span className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.3em]">Processing Pipeline</span>
            <span className="text-2xl font-black italic text-white tracking-tighter">{Math.round(progress)}%</span>
          </div>
          <div className="h-3 bg-zinc-900 rounded-full overflow-hidden border border-white/5 p-0.5">
            <div 
              className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-700 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[move-bg_1s_linear_infinite]" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-4 transition-all hover:bg-zinc-900/60 group/card">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Total</p>
            <p className="text-2xl font-black text-white tracking-tight">{total}</p>
            <div className="h-0.5 w-0 group-hover/card:w-full bg-zinc-700 transition-all duration-500 mt-2" />
          </div>
          
          <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-4 transition-all hover:bg-zinc-900/60 group/card">
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Sent</p>
            <p className="text-2xl font-black text-white tracking-tight">{sent}</p>
            <div className="h-0.5 w-0 group-hover/card:w-full bg-blue-500/50 transition-all duration-500 mt-2" />
          </div>

          <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-4 transition-all hover:bg-zinc-900/60 group/card">
            <p className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest mb-1">Done</p>
            <p className="text-2xl font-black text-white tracking-tight">{done}</p>
            <div className="h-0.5 w-0 group-hover/card:w-full bg-cyan-500/50 transition-all duration-500 mt-2" />
          </div>

          <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-4 transition-all hover:bg-zinc-900/60 group/card">
            <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">Error</p>
            <p className="text-2xl font-black text-white tracking-tight">{error}</p>
            <div className="h-0.5 w-0 group-hover/card:w-full bg-red-500/50 transition-all duration-500 mt-2" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-white/5">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${progress === 100 ? 'bg-cyan-500 animate-pulse' : 'bg-zinc-700 animate-pulse'}`} />
            <span className={`text-[10px] font-bold uppercase tracking-widest ${progress === 100 ? 'text-cyan-500' : 'text-zinc-500'}`}>
              {progress === 100 ? 'Process Complete' : 'Active Neural Stream'}
            </span>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes move-bg {
          0% { background-position: 0 0; }
          100% { background-position: 20px 0; }
        }
      `}} />
    </div>
  );
}

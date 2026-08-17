import React from 'react';
import { GameMode, CareerStats } from '../types/tetris';

interface MainMenuProps {
  onStartGame: (mode: GameMode) => void;
  onOpenSettings: () => void;
  onOpenStats: () => void;
  careerStats: CareerStats;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  onOpenSettings,
  onOpenStats,
  careerStats,
  isMuted,
  onToggleMute,
}) => {
  const formatSprintTime = (ms: number) => {
    if (!ms || ms <= 0) return '--:--.---';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const millis = ms % 1000;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-between p-4 select-none font-mono text-white relative z-20">
      {/* Top Bar / Status */}
      <div className="w-full flex justify-between items-center text-[9px] border-b border-neutral-800 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-white inline-block animate-pulse"></span>
          <span className="tracking-widest text-neutral-300">CORE_ENGINE_ONLINE // v2.0</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMute}
            className="border border-white/60 hover:border-white px-2 py-0.5 text-[9px] font-bold active:bg-white active:text-black transition-colors"
          >
            {isMuted ? 'AUDIO: OFF' : 'AUDIO: ON'}
          </button>
        </div>
      </div>

      {/* Hero / Logo Section */}
      <div className="w-full flex flex-col items-center justify-center my-auto py-2 text-center">
        <div className="relative mb-3 group">
          <img
            src="/icon.png"
            alt="Naga Tetris"
            className="w-20 h-20 sm:w-24 sm:h-24 border-2 border-white bg-black object-contain shadow-[0_0_25px_rgba(255,255,255,0.2)] group-hover:scale-105 transition-transform"
          />
          <div className="corner corner-tl"></div>
          <div className="corner corner-tr"></div>
          <div className="corner corner-bl"></div>
          <div className="corner corner-br"></div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black tracking-[0.25em] text-white uppercase mt-1">
          NAGA TETRIS
        </h1>
        <p className="metadata text-[9px] text-neutral-400 tracking-widest mt-0.5">
          VOID_STACK // PRO_COMPETITIVE_EDITION
        </p>
      </div>

      {/* Mode Selection Cards (Full Ergonomic Touch Targets) */}
      <div className="w-full max-w-sm flex flex-col gap-2 my-auto">
        <button
          onClick={() => onStartGame('MARATHON')}
          className="w-full p-2.5 border-2 border-white bg-black hover:bg-white hover:text-black active:scale-[0.98] transition-all text-left flex justify-between items-center group relative overflow-hidden"
        >
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-black tracking-wider uppercase">
              1. MARATHON MODE
            </span>
            <span className="text-[8px] text-neutral-400 group-hover:text-neutral-700">
              150 Lines / Endless Gravity Escalation
            </span>
          </div>
          <div className="text-right flex flex-col items-end">
            <span className="text-[7px] text-neutral-400 group-hover:text-neutral-700">HI_SCORE</span>
            <span className="text-[11px] font-bold font-mono">
              {String(careerStats.marathonHighScore).padStart(6, '0')}
            </span>
          </div>
        </button>

        <button
          onClick={() => onStartGame('SPRINT')}
          className="w-full p-2.5 border border-white/80 bg-black hover:bg-white hover:text-black active:scale-[0.98] transition-all text-left flex justify-between items-center group relative overflow-hidden"
        >
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-black tracking-wider uppercase">
              2. 40-LINE SPRINT
            </span>
            <span className="text-[8px] text-neutral-400 group-hover:text-neutral-700">
              Pure Speedrun // Millisecond Stopwatch
            </span>
          </div>
          <div className="text-right flex flex-col items-end">
            <span className="text-[7px] text-neutral-400 group-hover:text-neutral-700">PB_TIME</span>
            <span className="text-[11px] font-bold font-mono">
              {formatSprintTime(careerStats.bestSprintMs)}
            </span>
          </div>
        </button>

        <button
          onClick={() => onStartGame('BLITZ')}
          className="w-full p-2.5 border border-white/80 bg-black hover:bg-white hover:text-black active:scale-[0.98] transition-all text-left flex justify-between items-center group relative overflow-hidden"
        >
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-black tracking-wider uppercase">
              3. 2-MINUTE BLITZ
            </span>
            <span className="text-[8px] text-neutral-400 group-hover:text-neutral-700">
              120s Timed Score Attack // High Intensity
            </span>
          </div>
          <div className="text-right flex flex-col items-end">
            <span className="text-[7px] text-neutral-400 group-hover:text-neutral-700">HI_BLITZ</span>
            <span className="text-[11px] font-bold font-mono">
              {String(careerStats.bestBlitzScore).padStart(6, '0')} PTS
            </span>
          </div>
        </button>

        <button
          onClick={() => onStartGame('ZEN')}
          className="w-full p-2.5 border border-neutral-700 bg-neutral-950 hover:bg-white hover:text-black active:scale-[0.98] transition-all text-left flex justify-between items-center group relative overflow-hidden"
        >
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-black tracking-wider uppercase">
              4. ZEN SANDBOX
            </span>
            <span className="text-[8px] text-neutral-400 group-hover:text-neutral-700">
              Infinite Practice // T-Spin & PC Setups
            </span>
          </div>
          <span className="text-[10px] font-bold text-neutral-400 group-hover:text-black">
            [FREE_PLAY]
          </span>
        </button>
      </div>

      {/* Footer Navigation Buttons */}
      <div className="w-full max-w-sm grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800">
        <button
          onClick={onOpenSettings}
          className="industrial-btn py-2 text-[10px] font-bold tracking-wider flex items-center justify-center gap-1 active:bg-white active:text-black"
        >
          <span>⚙</span> CONFIG & DAS
        </button>

        <button
          onClick={onOpenStats}
          className="industrial-btn py-2 text-[10px] font-bold tracking-wider flex items-center justify-center gap-1 active:bg-white active:text-black"
        >
          <span>📊</span> CAREER STATS
        </button>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { GameStats } from '../types/tetris';

interface ScoreBoardProps {
  stats: GameStats;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  isPaused: boolean;
}

const SystemClock = () => {
  const [clock, setClock] = useState('00:00:00');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClock(
        `${now.getHours().toString().padStart(2, '0')}:${now
          .getMinutes()
          .toString()
          .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return <span className="text-[11px] sm:text-xs font-bold tracking-widest leading-none font-mono">[{clock}]</span>;
};

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  stats,
  isMuted,
  onToggleMute,
  onPause,
  isPaused,
}) => {
  return (
    <div className="w-full flex flex-col gap-1.5 z-10 select-none">
      {/* Top Telemetry Bar */}
      <div className="w-full flex justify-between items-center px-1">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <span className="metadata text-[7px]">SYSTEM_CLOCK</span>
            <SystemClock />
          </div>
        </div>

        {/* Action icons: Sound & Pause with square borders */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleMute}
            className="border border-white bg-black px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider hover:bg-white hover:text-black active:translate-y-0.5 transition-colors"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? '[MUTE:ON]' : '[MUTE:OFF]'}
          </button>
          <button
            onClick={onPause}
            className="border border-white bg-black px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider hover:bg-white hover:text-black active:translate-y-0.5 transition-colors"
            title="Pause Game (ESC / P)"
          >
            {isPaused ? '[RESUME]' : '[PAUSE]'}
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="w-full grid grid-cols-4 gap-1.5 text-center">
        <div className="border border-white/40 bg-black/60 p-1 flex flex-col justify-center">
          <span className="metadata text-[7px] leading-tight">BYTE_COUNT</span>
          <span className="text-xs sm:text-sm font-bold tracking-wider font-mono text-white">
            {String(stats.score).padStart(6, '0')}
          </span>
        </div>

        <div className="border border-white/40 bg-black/60 p-1 flex flex-col justify-center">
          <span className="metadata text-[7px] leading-tight">HI_SCORE</span>
          <span className="text-xs sm:text-sm font-bold tracking-wider font-mono text-neutral-300">
            {String(stats.highScore).padStart(6, '0')}
          </span>
        </div>

        <div className="border border-white/40 bg-black/60 p-1 flex flex-col justify-center">
          <span className="metadata text-[7px] leading-tight">BUFFER_LVL</span>
          <span className="text-xs sm:text-sm font-bold tracking-wider font-mono text-white">
            LV_{String(stats.level).padStart(2, '0')}
          </span>
        </div>

        <div className="border border-white/40 bg-black/60 p-1 flex flex-col justify-center">
          <span className="metadata text-[7px] leading-tight">PURGED</span>
          <span className="text-xs sm:text-sm font-bold tracking-wider font-mono text-white">
            {String(stats.lines).padStart(3, '0')}
          </span>
        </div>
      </div>

      {/* Combo & B2B Status Tag if active */}
      {(stats.combo > 0 || stats.backToBack) && (
        <div className="w-full flex justify-between items-center px-1 text-[8px] font-mono font-bold tracking-widest text-neutral-400">
          <span>{stats.combo > 0 ? `// COMBO: x${stats.combo}` : ''}</span>
          <span>{stats.backToBack ? '[B2B_ACTIVE: 1.5x]' : ''}</span>
        </div>
      )}
    </div>
  );
};

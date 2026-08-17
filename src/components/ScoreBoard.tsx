import React from 'react';
import { GameStats, GameMode } from '../types/tetris';

interface ScoreBoardProps {
  stats: GameStats;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  isPaused: boolean;
  onOpenSettings: () => void;
  sprintElapsedTimeMs?: number;
  blitzRemainingMs?: number;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  stats,
  isMuted,
  onToggleMute,
  onPause,
  isPaused,
  onOpenSettings,
  sprintElapsedTimeMs = 0,
  blitzRemainingMs = 120000,
}) => {
  const formatTime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const millis = Math.floor((ms % 1000) / 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
  };

  const getModeLabel = (mode: GameMode) => {
    switch (mode) {
      case 'SPRINT':
        return '40L_SPRINT';
      case 'BLITZ':
        return 'BLITZ_2M';
      case 'ZEN':
        return 'ZEN_FREE';
      case 'MARATHON':
      default:
        return 'MARATHON';
    }
  };

  return (
    <div className="w-full flex flex-col gap-1.5 z-10 select-none">
      {/* Top Telemetry & Logo Bar (100% Pure Black & White) */}
      <div className="w-full flex justify-between items-center px-1">
        <div className="flex items-center gap-2">
          <img
            src="/icon.png"
            alt="Naga Tetris"
            className="w-7 h-7 border border-white bg-black object-contain"
          />
          <div className="flex flex-col">
            <span className="text-[11px] sm:text-xs font-black font-mono tracking-widest text-white">
              NAGA-TTRIS
            </span>
            <button
              onClick={onOpenSettings}
              className="metadata text-[7px] text-neutral-400 leading-none hover:text-white flex items-center gap-1 text-left"
            >
              [{getModeLabel(stats.mode)}] <span className="underline">[CONFIG]</span>
            </button>
          </div>
        </div>

        {/* Live Mode Telemetry (Stopwatch for Sprint, Countdown for Blitz, Uptime for Marathon) */}
        <div className="flex items-center gap-1.5">
          {stats.mode === 'SPRINT' && (
            <div className="flex flex-col items-end pr-1 border-r border-neutral-800">
              <span className="metadata text-[7px] text-neutral-400">SPRINT_TIME</span>
              <span className="text-[11px] font-bold font-mono text-white tracking-wider">
                {formatTime(sprintElapsedTimeMs)}
              </span>
            </div>
          )}

          {stats.mode === 'BLITZ' && (
            <div className="flex flex-col items-end pr-1 border-r border-neutral-800">
              <span className="metadata text-[7px] text-neutral-400">TIME_LEFT</span>
              <span className="text-[11px] font-bold font-mono text-white tracking-wider">
                {formatTime(Math.max(0, blitzRemainingMs))}
              </span>
            </div>
          )}

          {/* Action buttons */}
          <button
            onClick={onOpenSettings}
            className="border border-white bg-black px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider hover:bg-white hover:text-black active:translate-y-0.5 transition-colors"
            title="Game Settings & Modes"
          >
            ⚙
          </button>
          <button
            onClick={onToggleMute}
            className="border border-white bg-black px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider hover:bg-white hover:text-black active:translate-y-0.5 transition-colors"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? 'MUTED' : 'SFX:ON'}
          </button>
          <button
            onClick={onPause}
            className="border border-white bg-black px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider hover:bg-white hover:text-black active:translate-y-0.5 transition-colors"
            title="Pause Game"
          >
            {isPaused ? 'RESUME' : 'PAUSE'}
          </button>
        </div>
      </div>

      {/* Primary Metrics Telemetry Row */}
      <div className="w-full grid grid-cols-4 gap-1.5 text-center">
        <div className="border border-white/40 bg-black/60 p-1 flex flex-col justify-center">
          <span className="metadata text-[7px] leading-tight">
            {stats.mode === 'SPRINT' ? 'LINES_LEFT' : 'BYTE_COUNT'}
          </span>
          <span className="text-xs sm:text-sm font-bold tracking-wider font-mono text-white">
            {stats.mode === 'SPRINT'
              ? `${Math.max(0, 40 - stats.lines)} / 40`
              : String(stats.score).padStart(6, '0')}
          </span>
        </div>

        <div className="border border-white/40 bg-black/60 p-1 flex flex-col justify-center">
          <span className="metadata text-[7px] leading-tight">
            {stats.mode === 'SPRINT' ? 'PB_RECORD' : 'HI_SCORE'}
          </span>
          <span className="text-xs sm:text-sm font-bold tracking-wider font-mono text-neutral-300">
            {stats.mode === 'SPRINT'
              ? (stats.bestSprintMs ? formatTime(stats.bestSprintMs) : '--:--.--')
              : String(stats.highScore).padStart(6, '0')}
          </span>
        </div>

        <div className="border border-white/40 bg-black/60 p-1 flex flex-col justify-center">
          <span className="metadata text-[7px] leading-tight">
            {stats.mode === 'ZEN' ? 'SPEED' : 'BUFFER_LVL'}
          </span>
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

      {/* Combo, Back-to-Back, and Perfect Clear Status Badges */}
      {(stats.combo > 0 || stats.backToBack || stats.perfectClears > 0) && (
        <div className="w-full flex justify-between items-center px-1 text-[8px] font-mono font-bold tracking-widest text-neutral-300">
          <span>{stats.combo > 0 ? `// COMBO: x${stats.combo}` : ''}</span>
          <span>{stats.perfectClears > 0 ? `[PC: ${stats.perfectClears}]` : ''}</span>
          <span>{stats.backToBack ? '[B2B_ACTIVE: 1.5x]' : ''}</span>
        </div>
      )}
    </div>
  );
};


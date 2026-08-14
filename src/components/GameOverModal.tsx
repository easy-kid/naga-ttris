import React from 'react';
import { GameStats } from '../types/tetris';

interface GameOverModalProps {
  stats: GameStats;
  isNewHighScore: boolean;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  isNewHighScore,
  onRestart,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4 select-none font-mono animate-fadeIn">
      <div className="w-full max-w-xs border-2 border-white bg-black p-4 flex flex-col items-center text-center relative">
        {/* Corner Accents */}
        <div className="corner corner-tl z-20"></div>
        <div className="corner corner-tr z-20"></div>
        <div className="corner corner-bl z-20"></div>
        <div className="corner corner-br z-20"></div>

        {/* Title */}
        <span className="text-red-500 font-black tracking-widest text-lg glitch-flash px-2 py-0.5 uppercase mb-1">
          FATAL_ERROR
        </span>
        <span className="text-white text-xs font-bold uppercase tracking-[0.25em] mt-1">
          STACK_HEAP_OVERFLOW
        </span>
        <span className="metadata text-[8px] mt-0.5">// SYSTEM_HALTED //</span>

        {isNewHighScore && (
          <div className="mt-3 border border-white bg-white text-black px-2 py-1 text-[10px] font-black tracking-widest uppercase animate-bounce">
            ★ NEW_HIGH_RECORD_ESTABLISHED ★
          </div>
        )}

        {/* Telemetry Summary Table */}
        <div className="w-full my-4 border-t border-b border-white/30 py-2.5 space-y-1.5 text-[11px] text-left">
          <div className="flex justify-between">
            <span className="text-neutral-400">FINAL_SCORE:</span>
            <span className="font-bold text-white tracking-wider">
              {String(stats.score).padStart(6, '0')}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-neutral-400">HIGH_SCORE:</span>
            <span className="font-bold text-neutral-300 tracking-wider">
              {String(stats.highScore).padStart(6, '0')}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-neutral-400">LINES_PURGED:</span>
            <span className="font-bold text-white">{stats.lines}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-neutral-400">BUFFER_LEVEL:</span>
            <span className="font-bold text-white">{stats.level}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-neutral-400">QUAD_TETRISES:</span>
            <span className="font-bold text-white">{stats.tetrises}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-neutral-400">MAX_COMBO:</span>
            <span className="font-bold text-white">x{stats.maxCombo}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-neutral-400">UPTIME:</span>
            <span className="font-bold text-white">{formatTime(stats.elapsedSeconds)}</span>
          </div>
        </div>

        {/* Reboot Button */}
        <button
          onClick={onRestart}
          className="w-full industrial-btn bg-white !text-black hover:bg-black hover:!text-white active:translate-y-0.5 transition-all text-xs font-black tracking-widest py-3 uppercase"
        >
          [ REBOOT_SYSTEM() ]
        </button>
      </div>
    </div>
  );
};

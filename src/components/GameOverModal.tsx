import React from 'react';
import { GameStats, GameStatus } from '../types/tetris';

interface GameOverModalProps {
  stats: GameStats;
  status: GameStatus;
  isNewHighScore: boolean;
  isNewBestSprint?: boolean;
  onRestart: () => void;
  onOpenSettings: () => void;
  onReturnToMenu?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  status,
  isNewHighScore,
  isNewBestSprint,
  onRestart,
  onOpenSettings,
  onReturnToMenu,
}) => {
  const isVictory = status === 'VICTORY';

  const formatSprintTime = (ms?: number) => {
    if (!ms || ms <= 0) return '--:--.---';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const millis = ms % 1000;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4 select-none font-mono animate-fadeIn">
      <div className="w-full max-w-xs border-2 border-white bg-black p-4 flex flex-col items-center text-center relative shadow-[0_0_25px_rgba(255,255,255,0.2)]">
        {/* Corner Accents */}
        <div className="corner corner-tl z-20"></div>
        <div className="corner corner-tr z-20"></div>
        <div className="corner corner-bl z-20"></div>
        <div className="corner corner-br z-20"></div>

        {/* Title */}
        {isVictory ? (
          <>
            <span className="border border-white bg-white text-black font-black tracking-widest text-base px-2 py-0.5 uppercase mb-1">
              ★ MISSION_ACCOMPLISHED ★
            </span>
            <span className="text-white text-xs font-bold uppercase tracking-[0.2em] mt-1">
              {stats.mode === 'SPRINT' ? '40L_SPRINT_PURGED' : 'BLITZ_TIME_CONCLUDED'}
            </span>
          </>
        ) : (
          <>
            <span className="text-white border border-white bg-black font-black tracking-widest text-base px-2 py-0.5 uppercase mb-1">
              FATAL_ERROR
            </span>
            <span className="text-white text-xs font-bold uppercase tracking-[0.25em] mt-1">
              STACK_OVERFLOW
            </span>
          </>
        )}
        <span className="metadata text-[8px] mt-0.5">// MODE: {stats.mode} //</span>

        {(isNewHighScore || isNewBestSprint) && (
          <div className="mt-2.5 border border-white bg-white text-black px-2 py-1 text-[9px] font-black tracking-widest uppercase animate-pulse">
            ★ NEW_PERSONAL_RECORD ★
          </div>
        )}

        {/* Telemetry Summary Table */}
        <div className="w-full my-3 border-t border-b border-white/30 py-2 space-y-1 text-[11px] text-left">
          {stats.mode === 'SPRINT' ? (
            <>
              <div className="flex justify-between">
                <span className="text-neutral-400">CLEAR_TIME:</span>
                <span className="font-bold text-white tracking-wider">
                  {formatSprintTime(stats.sprintTimeMs)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">BEST_SPRINT_PB:</span>
                <span className="font-bold text-neutral-300 tracking-wider">
                  {formatSprintTime(stats.bestSprintMs)}
                </span>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}

          <div className="flex justify-between">
            <span className="text-neutral-400">LINES_PURGED:</span>
            <span className="font-bold text-white">{stats.lines}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-neutral-400">PIECES / SEC (PPS):</span>
            <span className="font-bold text-white">
              {stats.elapsedSeconds > 0
                ? (stats.piecesPlaced / stats.elapsedSeconds).toFixed(2)
                : '0.00'}{' '}
              pps
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-neutral-400">QUAD_TETRISES:</span>
            <span className="font-bold text-white">{stats.tetrises}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-neutral-400">T_SPINS:</span>
            <span className="font-bold text-white">{stats.tSpins}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-neutral-400">PERFECT_CLEARS:</span>
            <span className="font-bold text-white">{stats.perfectClears}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-neutral-400">MAX_COMBO:</span>
            <span className="font-bold text-white">x{Math.max(0, stats.maxCombo)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-neutral-400">UPTIME:</span>
            <span className="font-bold text-white">{formatTime(stats.elapsedSeconds)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-1.5">
          <button
            onClick={onRestart}
            className="w-full industrial-btn !bg-white !text-black hover:opacity-90 active:scale-[0.99] text-xs font-black tracking-widest py-2.5 uppercase"
          >
            [ REPLAY_SESSION() ]
          </button>
          <button
            onClick={onOpenSettings}
            className="w-full industrial-btn border border-white bg-black hover:bg-neutral-900 active:scale-[0.99] text-[10px] font-bold tracking-widest py-1.5 uppercase text-neutral-300"
          >
            [ CHANGE_MODE // CONFIG ]
          </button>
          {onReturnToMenu && (
            <button
              onClick={onReturnToMenu}
              className="w-full industrial-btn border border-neutral-700 bg-neutral-950 hover:border-white active:scale-[0.99] text-[10px] font-bold tracking-widest py-1.5 uppercase text-neutral-400 hover:text-white"
            >
              [ RETURN_TO_MAIN_MENU ]
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


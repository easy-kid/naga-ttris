import React from 'react';
import { GameStats, GameMode, TetrominoType } from '../types/tetris';
import { TETROMINO_SHAPES } from '../engine/tetrisConstants';

interface ScoreBoardProps {
  stats: GameStats;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  isPaused: boolean;
  onOpenSettings: () => void;
  sprintElapsedTimeMs?: number;
  blitzRemainingMs?: number;
  heldPiece: TetrominoType | null;
  canHold: boolean;
  onHoldClick: () => void;
  nextQueue: TetrominoType[];
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
  heldPiece,
  canHold,
  onHoldClick,
  nextQueue,
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

  // Render Mini Piece for Hold Box
  const renderHoldPiece = () => {
    if (!heldPiece) {
      return (
        <span className="text-[8px] text-neutral-600 font-bold font-mono">[EMPTY]</span>
      );
    }
    const matrix = TETROMINO_SHAPES[heldPiece][0];
    const cellSize = heldPiece === 'I' ? 7.5 : 9;

    return (
      <div
        className="grid gap-0 place-content-center"
        style={{
          gridTemplateColumns: `repeat(${matrix[0].length}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${matrix.length}, ${cellSize}px)`,
        }}
      >
        {matrix.map((row, y) =>
          row.map((val, x) => (
            <div
              key={`hold-${x}-${y}`}
              className={`w-full h-full box-border ${
                val ? (canHold ? `piece-${heldPiece}` : 'piece-locked-preview') : 'bg-transparent'
              }`}
            />
          ))
        )}
      </div>
    );
  };

  // Render Queue (Next 5 pieces in a compact strip)
  const renderNextQueue = () => {
    const previews = nextQueue.slice(0, 5);
    return (
      <div className="flex items-center justify-between gap-1 w-full h-full px-1">
        {previews.map((type, idx) => {
          const matrix = TETROMINO_SHAPES[type][0];
          const cellSize = idx === 0 ? 8 : 6.5;
          return (
            <div
              key={`next-q-${idx}-${type}`}
              className={`flex flex-col items-center justify-center ${
                idx === 0 ? 'opacity-100 scale-105' : 'opacity-70 scale-90'
              }`}
            >
              <div
                className="grid gap-0 place-content-center"
                style={{
                  gridTemplateColumns: `repeat(${matrix[0].length}, ${cellSize}px)`,
                  gridTemplateRows: `repeat(${matrix.length}, ${cellSize}px)`,
                }}
              >
                {matrix.map((row, y) =>
                  row.map((val, x) => (
                    <div
                      key={`nq-${idx}-${x}-${y}`}
                      className={`w-full h-full box-border ${
                        val ? `piece-${type}` : 'bg-transparent'
                      }`}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col gap-1 z-20 select-none max-w-md mx-auto">
      {/* 1. Header Bar: Logo, Mode Badge, Quick Status & Control Buttons */}
      <div className="w-full flex justify-between items-center px-1">
        <div className="flex items-center gap-1.5">
          <img
            src="/icon.png"
            alt="Naga Tetris"
            className="w-5 h-5 border border-white bg-black object-contain"
          />
          <span className="text-[10px] font-black font-mono tracking-widest text-white">
            NAGA-TTRIS
          </span>
          <span className="metadata text-[6.5px] text-neutral-400 border border-neutral-800 px-1 py-0.2">
            {getModeLabel(stats.mode)}
          </span>
        </div>

        {/* Live Mode Timers & Controls */}
        <div className="flex items-center gap-1">
          {stats.mode === 'SPRINT' && (
            <div className="flex items-center gap-1 px-1 border border-neutral-800 bg-neutral-950">
              <span className="metadata text-[6px] text-neutral-400">TIME:</span>
              <span className="text-[9px] font-bold font-mono text-white">
                {formatTime(sprintElapsedTimeMs)}
              </span>
            </div>
          )}

          {stats.mode === 'BLITZ' && (
            <div className="flex items-center gap-1 px-1 border border-neutral-800 bg-neutral-950">
              <span className="metadata text-[6px] text-neutral-400">LEFT:</span>
              <span className="text-[9px] font-bold font-mono text-white">
                {formatTime(Math.max(0, blitzRemainingMs))}
              </span>
            </div>
          )}

          <button
            onClick={onOpenSettings}
            className="border border-white/60 bg-black px-1.5 py-0.5 text-[8.5px] font-mono uppercase hover:bg-white hover:text-black active:translate-y-0.5 transition-colors"
            title="Settings"
          >
            ⚙
          </button>
          <button
            onClick={onToggleMute}
            className="border border-white/60 bg-black px-1.5 py-0.5 text-[8.5px] font-mono uppercase hover:bg-white hover:text-black active:translate-y-0.5 transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? 'MUTED' : 'SFX'}
          </button>
          <button
            onClick={onPause}
            className="border border-white bg-black px-2 py-0.5 text-[8.5px] font-mono font-bold uppercase hover:bg-white hover:text-black active:translate-y-0.5 transition-colors"
            title="Pause"
          >
            {isPaused ? 'RESUME' : 'PAUSE'}
          </button>
        </div>
      </div>

      {/* 2. Tactical Cockpit Row: [HOLD BOX] + [2x2 METRICS TELEMETRY] + [NEXT 5 QUEUE STRIP] */}
      <div className="w-full grid grid-cols-12 gap-1 items-stretch">
        {/* Left: Interactive HOLD Box */}
        <div
          onClick={canHold ? onHoldClick : undefined}
          className={`col-span-3 relative border border-white bg-black p-0.5 flex flex-col items-center justify-center transition-all ${
            canHold
              ? 'cursor-pointer hover:bg-neutral-950 active:scale-[0.98]'
              : 'opacity-40 cursor-not-allowed border-neutral-700'
          }`}
          style={{ minHeight: '46px' }}
          title={canHold ? 'Hold piece (Tap or press C / Shift)' : 'Locked'}
        >
          <span className="metadata absolute -top-1.5 left-1 bg-black px-0.5 z-10 leading-none text-[6px]">
            HOLD
          </span>
          <div className={`w-full h-full flex items-center justify-center ${!canHold ? 'grayscale brightness-75' : ''}`}>
            {renderHoldPiece()}
          </div>
          <span className="metadata absolute -bottom-1 right-1 bg-black px-0.5 leading-none text-[5px]">
            {canHold ? 'READY' : 'LOCK'}
          </span>
        </div>

        {/* Center: High-Impact 2x2 Telemetry Matrix */}
        <div className="col-span-5 border border-white/60 bg-black/80 px-1 py-0.5 grid grid-cols-2 gap-x-1 gap-y-0.5 text-center items-center">
          <div className="flex flex-col">
            <span className="metadata text-[5.5px] text-neutral-400 leading-none">
              {stats.mode === 'SPRINT' ? 'LINES_LEFT' : 'SCORE'}
            </span>
            <span className="text-[10px] font-bold font-mono text-white leading-tight">
              {stats.mode === 'SPRINT'
                ? `${Math.max(0, 40 - stats.lines)}`
                : String(stats.score).padStart(6, '0')}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="metadata text-[5.5px] text-neutral-400 leading-none">
              {stats.mode === 'SPRINT' ? 'PB_TIME' : 'HI_SCORE'}
            </span>
            <span className="text-[10px] font-bold font-mono text-neutral-300 leading-tight">
              {stats.mode === 'SPRINT'
                ? (stats.bestSprintMs ? formatTime(stats.bestSprintMs) : '--:--')
                : String(stats.highScore).padStart(6, '0')}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="metadata text-[5.5px] text-neutral-400 leading-none">
              {stats.mode === 'ZEN' ? 'SPEED' : 'LEVEL'}
            </span>
            <span className="text-[10px] font-bold font-mono text-white leading-tight">
              LV_{String(stats.level).padStart(2, '0')}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="metadata text-[5.5px] text-neutral-400 leading-none">PURGED</span>
            <span className="text-[10px] font-bold font-mono text-white leading-tight">
              {String(stats.lines).padStart(3, '0')}
            </span>
          </div>
        </div>

        {/* Right: NEXT Queue 5-Piece Strip */}
        <div
          className="col-span-4 relative border border-white bg-black p-0.5 flex flex-col items-center justify-center"
          style={{ minHeight: '46px' }}
        >
          <span className="metadata absolute -top-1.5 left-1 bg-black px-0.5 z-10 leading-none text-[6px]">
            NEXT_5
          </span>
          {renderNextQueue()}
          <span className="metadata absolute -bottom-1 right-1 bg-black px-0.5 leading-none text-[5px]">
            QUEUE
          </span>
        </div>
      </div>

      {/* 3. Live Combos, Back-to-Back & Perfect Clear Badges */}
      {(stats.combo > 0 || stats.backToBack || stats.perfectClears > 0) && (
        <div className="w-full flex justify-between items-center px-1 text-[7.5px] font-mono font-bold tracking-wider text-neutral-200">
          <span>{stats.combo > 0 ? `// COMBO: x${stats.combo}` : ''}</span>
          <span>{stats.perfectClears > 0 ? `[★ ALL_CLEAR: ${stats.perfectClears}]` : ''}</span>
          <span>{stats.backToBack ? '[B2B: 1.5x]' : ''}</span>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { TetrominoType, GameStats } from '../types/tetris';
import { TETROMINO_SHAPES } from '../engine/tetrisConstants';

interface HoldPanelProps {
  heldPiece: TetrominoType | null;
  canHold: boolean;
  onHoldClick: () => void;
  stats?: GameStats;
}

export const HoldPanel: React.FC<HoldPanelProps> = ({ heldPiece, canHold, onHoldClick, stats }) => {
  const renderPiece = () => {
    if (!heldPiece) {
      return (
        <div className="w-full h-full flex items-center justify-center text-[9px] text-neutral-600 font-bold">
          [EMPTY]
        </div>
      );
    }

    const matrix = TETROMINO_SHAPES[heldPiece][0]; // 0 rotation state
    const cellSize = heldPiece === 'I' ? 9 : 11;

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
              key={`h-${x}-${y}`}
              className={`w-full h-full box-border ${
                val ? (canHold ? `piece-${heldPiece}` : 'piece-locked-preview') : 'bg-transparent'
              }`}
            />
          ))
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      {/* Primary HOLD Matrix */}
      <div
        onClick={canHold ? onHoldClick : undefined}
        className={`relative border-2 border-white bg-black p-1.5 flex flex-col items-center justify-center transition-all ${
          canHold
            ? 'cursor-pointer hover:bg-neutral-950 active:scale-[0.98]'
            : 'opacity-40 cursor-not-allowed border-neutral-700'
        }`}
        style={{ width: '64px', height: '64px' }}
        title={canHold ? 'Hold piece (Click or press C / Shift)' : 'Locked until piece placed'}
      >
        <span className="metadata absolute -top-2.5 left-1.5 bg-black px-1 z-10 leading-none text-[7px]">
          HOLD_MEM
        </span>
        <div className={`w-full h-full flex items-center justify-center ${!canHold ? 'grayscale brightness-75' : ''}`}>
          {renderPiece()}
        </div>
        <span className="metadata absolute -bottom-2 right-1.5 bg-black px-1 leading-none text-[6px]">
          {canHold ? 'READY' : 'LOCKED'}
        </span>
      </div>

      {/* Live Tactical Telemetry Pod (Aligns left column with 5-piece right queue) */}
      {stats && (
        <div className="w-[64px] border border-neutral-800 bg-neutral-950/80 p-1 flex flex-col gap-1 text-center">
          <div className="flex flex-col border-b border-neutral-800 pb-0.5">
            <span className="metadata text-[6px] text-neutral-400">PPS_SPEED</span>
            <span className="text-[10px] font-bold font-mono text-white leading-none">
              {stats.pps || '0.00'}
            </span>
          </div>

          <div className="flex flex-col border-b border-neutral-800 pb-0.5">
            <span className="metadata text-[6px] text-neutral-400">MAX_STREAK</span>
            <span className="text-[10px] font-bold font-mono text-neutral-300 leading-none">
              x{stats.maxCombo}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="metadata text-[6px] text-neutral-400">B2B_CHAIN</span>
            <span className={`text-[10px] font-bold font-mono leading-none ${stats.backToBack ? 'text-white' : 'text-neutral-600'}`}>
              {stats.backToBack ? `x${stats.b2bCount || 1}` : 'IDLE'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

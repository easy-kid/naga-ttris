import React from 'react';
import { TetrominoType } from '../types/tetris';
import { TETROMINO_SHAPES } from '../engine/tetrisConstants';

interface HoldPanelProps {
  heldPiece: TetrominoType | null;
  canHold: boolean;
  onHoldClick: () => void;
}

export const HoldPanel: React.FC<HoldPanelProps> = ({ heldPiece, canHold, onHoldClick }) => {
  const renderPiece = () => {
    if (!heldPiece) {
      return (
        <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-600 font-bold">
          [EMPTY]
        </div>
      );
    }

    const matrix = TETROMINO_SHAPES[heldPiece][0]; // 0 rotation state
    const cellSize = heldPiece === 'I' ? 10 : 12;

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
    <div
      onClick={canHold ? onHoldClick : undefined}
      className={`relative border-2 border-white bg-black p-2 flex flex-col items-center justify-center transition-all ${
        canHold ? 'cursor-pointer hover:bg-neutral-950 active:border-neutral-400' : 'opacity-70 cursor-not-allowed'
      }`}
      style={{ width: '80px', height: '80px' }}
      title={canHold ? 'Hold piece (Click or press C / Shift)' : 'Locked until piece placed'}
    >
      <span className="metadata absolute -top-2.5 left-2 bg-black px-1 z-10 leading-none">
        HOLD_MEM
      </span>
      <div className="w-full h-full flex items-center justify-center">
        {renderPiece()}
      </div>
      <span className="metadata absolute -bottom-2 right-2 bg-black px-1 leading-none text-[7px]">
        {canHold ? 'READY' : 'LOCKED'}
      </span>
    </div>
  );
};

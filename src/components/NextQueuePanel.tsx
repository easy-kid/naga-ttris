import React from 'react';
import { TetrominoType } from '../types/tetris';
import { TETROMINO_SHAPES } from '../engine/tetrisConstants';

interface NextQueuePanelProps {
  queue: TetrominoType[];
}

export const NextQueuePanel: React.FC<NextQueuePanelProps> = ({ queue }) => {
  const displayPieces = queue.slice(0, 3);

  const renderMiniPiece = (type: TetrominoType, index: number) => {
    const matrix = TETROMINO_SHAPES[type][0];
    const cellSize = index === 0 ? 11 : 9;

    return (
      <div
        key={`next-${index}-${type}`}
        className={`flex items-center justify-center ${index > 0 ? 'opacity-70 scale-90 -my-0.5' : ''}`}
        style={{ minHeight: '32px' }}
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
                key={`n-${index}-${x}-${y}`}
                className={`w-full h-full box-border ${
                  val ? `piece-${type}` : 'bg-transparent'
                }`}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className="relative border-2 border-white bg-black p-2 flex flex-col items-center justify-between"
      style={{ width: '80px', minHeight: '120px' }}
    >
      <span className="metadata absolute -top-2.5 left-2 bg-black px-1 z-10 leading-none">
        NEXT_MEM
      </span>
      <div className="w-full flex-1 flex flex-col items-center justify-around py-1">
        {displayPieces.map((type, idx) => renderMiniPiece(type, idx))}
      </div>
      <span className="metadata absolute -bottom-2 right-2 bg-black px-1 leading-none text-[7px]">
        QUEUE_03
      </span>
    </div>
  );
};

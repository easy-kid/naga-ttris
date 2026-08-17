import React from 'react';
import { BoardMatrix, ActivePiece, LastClearEvent } from '../types/tetris';
import { BOARD_ROWS, BOARD_COLS } from '../engine/tetrisConstants';

interface GameBoardProps {
  board: BoardMatrix;
  currentPiece: ActivePiece | null;
  ghostY: number;
  clearingLines: number[];
  lockCells: { x: number; y: number }[];
  dropFlash: boolean;
  lastClear: LastClearEvent | null;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  board,
  currentPiece,
  ghostY,
  clearingLines,
  lockCells,
  dropFlash,
  lastClear,
}) => {
  // Construct 2D display grid
  const displayGrid: (string | null)[][] = board.map((row) => [...row]);

  // Overlay Ghost Piece
  if (currentPiece && ghostY >= 0 && ghostY > currentPiece.y) {
    currentPiece.matrix.forEach((row, y) => {
      row.forEach((val, x) => {
        if (val !== 0) {
          const bY = ghostY + y;
          const bX = currentPiece.x + x;
          if (bY >= 0 && bY < BOARD_ROWS && bX >= 0 && bX < BOARD_COLS) {
            if (!displayGrid[bY][bX]) {
              displayGrid[bY][bX] = 'ghost';
            }
          }
        }
      });
    });
  }

  // Overlay Active Falling Piece
  if (currentPiece) {
    currentPiece.matrix.forEach((row, y) => {
      row.forEach((val, x) => {
        if (val !== 0) {
          const bY = currentPiece.y + y;
          const bX = currentPiece.x + x;
          if (bY >= 0 && bY < BOARD_ROWS && bX >= 0 && bX < BOARD_COLS) {
            displayGrid[bY][bX] = currentPiece.type;
          }
        }
      });
    });
  }

  return (
    <div
      className="relative border-2 border-white bg-black grid-bg select-none box-border shadow-2xl flex-shrink-0"
      style={{
        height: '100%',
        maxHeight: '100%',
        width: 'auto',
        aspectRatio: '10 / 20',
      }}
    >
      {/* Corner Bracket Accents (100% Square Brutalist Accents) */}
      <div className="corner corner-tl z-20"></div>
      <div className="corner corner-tr z-20"></div>
      <div className="corner corner-bl z-20"></div>
      <div className="corner corner-br z-20"></div>

      {/* 10x20 Grid Cells Matrix */}
      <div
        className={`w-full h-full absolute inset-0 z-10 grid gap-0 ${
          dropFlash ? 'anim-drop-flash' : ''
        }`}
        style={{
          gridTemplateColumns: `repeat(${BOARD_COLS}, 1fr)`,
          gridTemplateRows: `repeat(${BOARD_ROWS}, 1fr)`,
        }}
      >
        {displayGrid.map((row, y) =>
          row.map((cellType, x) => {
            const isClearing = clearingLines.includes(y);
            const isLocking = lockCells.some((lc) => lc.x === x && lc.y === y);

            return (
              <div
                key={`cell-${x}-${y}`}
                className={`w-full h-full box-border ${
                  cellType ? `piece-${cellType}` : ''
                } ${isLocking ? 'anim-lock' : ''} ${
                  isClearing ? 'anim-row-clear' : ''
                }`}
              />
            );
          })
        )}
      </div>

      {/* Banner / Clear Effect Overlay */}
      {lastClear && Date.now() - lastClear.timestamp < 1500 && (
        <div className="absolute inset-0 pointer-events-none z-30 flex flex-col items-center justify-center p-2">
          <div
            className={`border-2 border-white px-4 py-2.5 text-center shadow-2xl ${
              lastClear.isPerfectClear
                ? 'bg-white text-black font-black anim-lock scale-110'
                : 'bg-black/95 text-white'
            }`}
          >
            <div className="text-sm sm:text-base font-black font-mono tracking-widest uppercase">
              {lastClear.isPerfectClear
                ? '★ ALL_CLEAR // PERFECT ★'
                : lastClear.type === 'TETRIS'
                ? '[ TETRIS // QUAD PURGE ]'
                : lastClear.type?.includes('TSPIN')
                ? `[ ${lastClear.type} ]`
                : `[ +${lastClear.points} PTS ]`}
            </div>
            {lastClear.b2b && !lastClear.isPerfectClear && (
              <div className="text-[10px] font-mono font-bold tracking-wider mt-0.5 opacity-90">
                // BACK-TO-BACK BONUS
              </div>
            )}
            {lastClear.combo > 0 && (
              <div className="text-[10px] font-mono font-bold tracking-wider">
                COMBO x{lastClear.combo}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

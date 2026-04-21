import React, { useState, useEffect, useRef, useCallback } from 'react';

// Constants
const ROWS = 20;
const COLS = 10;

// Tetrominoes definitions
const TETROMINOES = {
  I: { shape: [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]], name: 'I' },
  J: { shape: [[1,0,0], [1,1,1], [0,0,0]], name: 'J' },
  L: { shape: [[0,0,1], [1,1,1], [0,0,0]], name: 'L' },
  O: { shape: [[1,1], [1,1]], name: 'O' },
  S: { shape: [[0,1,1], [1,1,0], [0,0,0]], name: 'S' },
  T: { shape: [[0,1,0], [1,1,1], [0,0,0]], name: 'T' },
  Z: { shape: [[1,1,0], [0,1,1], [0,0,0]], name: 'Z' }
};

type TetrominoName = keyof typeof TETROMINOES;

const randomTetromino = () => {
  const keys = Object.keys(TETROMINOES) as TetrominoName[];
  const key = keys[Math.floor(Math.random() * keys.length)];
  return TETROMINOES[key];
};

const createEmptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(null));

// Custom Hook for DAS (Delayed Auto Shift)
const useHoldAction = (action: () => void, initialDelay = 180, repeatDelay = 40) => {
  const timeoutRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);

  const start = useCallback((e?: React.PointerEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    if (e) {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
    }
    action();
    clearTimeout(timeoutRef.current);
    clearInterval(intervalRef.current);
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(action, repeatDelay);
    }, initialDelay);
  }, [action, initialDelay, repeatDelay]);

  const stop = useCallback((e?: React.PointerEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement> | Event) => {
    if (e) {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
    }
    clearTimeout(timeoutRef.current);
    clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    return () => { stop(); };
  }, [stop]);

  return { onPointerDown: start, onPointerUp: stop, onPointerLeave: stop, onTouchStart: start, onTouchEnd: stop };
};

// Extracted Clock Component to avoid full re-renders
const SystemClock = () => {
  const [clock, setClock] = useState('00:00:00');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClock(
        `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return <span className="text-xs sm:text-sm font-bold tracking-widest leading-none">[{clock}]</span>;
};

export default function App() {
  const [board, setBoard] = useState<string[][]>(createEmptyBoard());
  const [currentPiece, setCurrentPiece] = useState<any>(null);
  const [nextPiece, setNextPiece] = useState<any>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [clearingLines, setClearingLines] = useState<number[]>([]);
  const [hudFlash, setHudFlash] = useState(false);
  const [shake, setShake] = useState(false);
  const [lockCells, setLockCells] = useState<{x:number, y:number}[]>([]);
  const [dropFlash, setDropFlash] = useState(false);

  // Refs for game loop and input
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const dropCounterRef = useRef<number>(0);
  const dropIntervalRef = useRef<number>(1000);
  const isProcessingRef = useRef<boolean>(false); // NEW: prevent race conditions during async drops
  
  // Ref for the state to avoid capturing stale closures in game loop
  const stateRef = useRef({
    board,
    currentPiece,
    nextPiece,
    score,
    level,
    gameOver,
    clearingLines
  });

  useEffect(() => {
    stateRef.current = { board, currentPiece, nextPiece, score, level, gameOver, clearingLines };
  }, [board, currentPiece, nextPiece, score, level, gameOver, clearingLines]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 150);
  };

  const checkCollision = (pieceX: number, pieceY: number, matrix: number[][], currentBoard: string[][]) => {
    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        if (matrix[y][x] !== 0) {
          const newX = pieceX + x;
          const newY = pieceY + y;
          if (
            newX < 0 || newX >= COLS || newY >= ROWS ||
            (newY >= 0 && currentBoard[newY][newX] !== null)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const calculateGhostY = (pieceX: number, pieceY: number, matrix: number[][], currentBoard: string[][]) => {
    let ghostY = pieceY;
    while (!checkCollision(pieceX, ghostY + 1, matrix, currentBoard)) {
      ghostY++;
    }
    return ghostY;
  };

  const mergePiece = (pieceToMerge: any, currentBoard: string[][]) => {
    const newBoard = currentBoard.map(row => [...row]);
    pieceToMerge.matrix.forEach((row: number[], y: number) => {
      row.forEach((value: number, x: number) => {
        if (value !== 0) {
          const boardY = pieceToMerge.y + y;
          const boardX = pieceToMerge.x + x;
          if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
            newBoard[boardY][boardX] = pieceToMerge.name;
          }
        }
      });
    });
    return newBoard;
  };

  const spawnPiece = () => {
    const { nextPiece } = stateRef.current;
    const newPiece = nextPiece ? nextPiece : randomTetromino();
    const newNextPiece = randomTetromino();
    
    const matrix = newPiece.shape;
    const x = Math.floor((COLS - matrix[0].length) / 2);
    const y = -1;

    if (checkCollision(x, y, matrix, stateRef.current.board)) {
      setGameOver(true);
      return null;
    }

    const cp = { name: newPiece.name, matrix: matrix, x, y };
    setCurrentPiece(cp);
    setNextPiece(newNextPiece);
    return cp;
  };

  const clearLines = async (currentBoard: string[][]) => {
    const linesToClear: number[] = [];
    currentBoard.forEach((row, y) => {
      if (row.every(cell => cell !== null)) {
        linesToClear.push(y);
      }
    });

    if (linesToClear.length > 0) {
      setClearingLines(linesToClear);
      triggerShake();
      
      const lineScores = [0, 40, 100, 300, 1200];
      const { score, level } = stateRef.current;
      const newScore = score + lineScores[linesToClear.length] * (level + 1);
      const newLevel = Math.floor(newScore / 400); 
      
      setScore(newScore);
      setLevel(newLevel);
      dropIntervalRef.current = Math.max(100, 1000 - (newLevel * 100));

      // Wait for CSS animation
      await new Promise(resolve => setTimeout(resolve, 250));
      
      const newBoard = currentBoard.filter((_, idx) => !linesToClear.includes(idx));
      while (newBoard.length < ROWS) {
        newBoard.unshift(Array(COLS).fill(null));
      }
      
      setClearingLines([]);
      return newBoard;
    }
    return currentBoard;
  };

  const drop = async () => {
    const { currentPiece, board } = stateRef.current;
    if (!currentPiece || isProcessingRef.current) return;

    dropCounterRef.current = 0; // Synchronous reset to avoid race conditions

    if (!checkCollision(currentPiece.x, currentPiece.y + 1, currentPiece.matrix, board)) {
      setCurrentPiece({ ...currentPiece, y: currentPiece.y + 1 });
    } else {
      isProcessingRef.current = true;
      let newBoard = mergePiece(currentPiece, board);
      setBoard(Object.assign([...newBoard]));
      
      const lockedCoords: {x:number, y:number}[] = [];
      currentPiece.matrix.forEach((row: number[], y: number) => row.forEach((val: number, x: number) => {
         if (val !== 0) lockedCoords.push({ x: currentPiece.x + x, y: currentPiece.y + y });
      }));
      setLockCells(lockedCoords);
      setTimeout(() => setLockCells([]), 300);

      setCurrentPiece(null);

      newBoard = await clearLines(newBoard);
      
      if (!stateRef.current.gameOver) {
        setBoard(newBoard);
        spawnPiece();
      }
      isProcessingRef.current = false;
    }
  };

  const moveLeft = () => {
    const { currentPiece, board, gameOver } = stateRef.current;
    if (gameOver || !currentPiece || isProcessingRef.current) return;
    if (!checkCollision(currentPiece.x - 1, currentPiece.y, currentPiece.matrix, board)) {
      setCurrentPiece({ ...currentPiece, x: currentPiece.x - 1 });
    }
  };

  const moveRight = () => {
    const { currentPiece, board, gameOver } = stateRef.current;
    if (gameOver || !currentPiece || isProcessingRef.current) return;
    if (!checkCollision(currentPiece.x + 1, currentPiece.y, currentPiece.matrix, board)) {
      setCurrentPiece({ ...currentPiece, x: currentPiece.x + 1 });
    }
  };

  const rotate = () => {
    const { currentPiece, board, gameOver } = stateRef.current;
    if (gameOver || !currentPiece || isProcessingRef.current) return;

    // Transpose and reverse rows (90deg clockwise)
    const transposed = currentPiece.matrix[0].map((_: any, i: number) => 
      currentPiece.matrix.map((row: any[]) => row[i])
    );
    const rotatedMatrix = transposed.map((row: any[]) => row.reverse());

    if (!checkCollision(currentPiece.x, currentPiece.y, rotatedMatrix, board)) {
      setCurrentPiece({ ...currentPiece, matrix: rotatedMatrix });
      setHudFlash(true); setTimeout(() => setHudFlash(false), 100);
    } else {
      // Basic wall kicks
      if (!checkCollision(currentPiece.x + 1, currentPiece.y, rotatedMatrix, board)) {
        setCurrentPiece({ ...currentPiece, matrix: rotatedMatrix, x: currentPiece.x + 1 });
        setHudFlash(true); setTimeout(() => setHudFlash(false), 100);
      } else if (!checkCollision(currentPiece.x - 1, currentPiece.y, rotatedMatrix, board)) {
        setCurrentPiece({ ...currentPiece, matrix: rotatedMatrix, x: currentPiece.x - 1 });
        setHudFlash(true); setTimeout(() => setHudFlash(false), 100);
      }
    }
  };

  const hardDrop = () => {
    const { currentPiece, board, gameOver } = stateRef.current;
    if (gameOver || !currentPiece || isProcessingRef.current) return;

    const ghostY = calculateGhostY(currentPiece.x, currentPiece.y, currentPiece.matrix, board);
    triggerShake();
    setDropFlash(true);
    setTimeout(() => setDropFlash(false), 150);
    const newPiece = { ...currentPiece, y: ghostY };
    setCurrentPiece(newPiece);
    dropCounterRef.current = dropIntervalRef.current; 
  };

  // Hold Action bindings
  const leftHoldParams = useHoldAction(moveLeft);
  const rightHoldParams = useHoldAction(moveRight);
  const fastDropParams = useHoldAction(drop, 0, 40);

  // Input listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent zooming/navigating backwards in browsers
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) {
        e.preventDefault();
      }
      if (stateRef.current.gameOver || isProcessingRef.current) return;

      switch (e.key) {
        case 'ArrowLeft': moveLeft(); break;
        case 'ArrowRight': moveRight(); break;
        case 'ArrowDown': drop(); break;
        case 'ArrowUp': rotate(); break;
        case ' ': hardDrop(); break;
      }
    };

    document.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Game Loop
  const gameLoop = (time = 0) => {
    if (stateRef.current.gameOver || isProcessingRef.current) {
      requestRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    if (!stateRef.current.currentPiece) {
      spawnPiece();
    }

    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;
    dropCounterRef.current += deltaTime;

    // Tick Drop
    if (dropCounterRef.current > dropIntervalRef.current) {
      drop();
    }

    requestRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  const resetGame = () => {
    setBoard(createEmptyBoard());
    setCurrentPiece(null);
    setNextPiece(null);
    setScore(0);
    setLevel(0);
    setGameOver(false);
    setClearingLines([]);
    isProcessingRef.current = false;
    dropIntervalRef.current = 1000;
  };

  const renderBoardGrid = () => {
    const displayBoard = board.map(row => [...row]);
    let ghostY = -1;

    if (currentPiece && !isProcessingRef.current) {
      ghostY = calculateGhostY(currentPiece.x, currentPiece.y, currentPiece.matrix, board);

      // Draw ghost
      if (ghostY > currentPiece.y) {
        currentPiece.matrix.forEach((row: number[], y: number) => {
          row.forEach((value: number, x: number) => {
             if (value !== 0) {
               const bY = ghostY + y;
               const bX = currentPiece.x + x;
               if (bY >= 0 && bY < ROWS && bX >= 0 && bX < COLS) {
                 if (!displayBoard[bY][bX]) displayBoard[bY][bX] = 'ghost';
               }
             }
          });
        });
      }

      // Draw solid piece
      currentPiece.matrix.forEach((row: number[], y: number) => {
        row.forEach((value: number, x: number) => {
           if (value !== 0) {
             const bY = currentPiece.y + y;
             const bX = currentPiece.x + x;
             if (bY >= 0 && bY < ROWS && bX >= 0 && bX < COLS) {
               displayBoard[bY][bX] = currentPiece.name;
             }
           }
        });
      });
    }

    const cells = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        let type = displayBoard[y][x];
        let isLocking = lockCells.some(lc => lc.x === x && lc.y === y);
        cells.push(
           <div
             key={`cell-${x}-${y}`}
             className={`w-full h-full box-border ${type ? `piece-${type}` : ''} ${isLocking ? 'anim-lock' : ''} ${clearingLines.includes(y) ? 'anim-row-clear' : ''}`}
           />
        );
      }
    }
    return cells;
  };
  
  const renderNextPiece = () => {
    if (!nextPiece) return null;
    const matrix = nextPiece.shape;
    return (
      <div className="grid gap-0 place-content-center w-full h-full" style={{ gridTemplateColumns: `repeat(${matrix[0].length}, 12px)`, gridTemplateRows: `repeat(${matrix.length}, 12px)` }}>
        {matrix.map((row: number[], y: number) => 
          row.map((val: number, x: number) => (
            <div 
              key={`n-cell-${x}-${y}`} 
              className={`w-full h-full box-border ${val ? `piece-${nextPiece.name}` : 'bg-transparent'}`} 
            />
          ))
        )}
      </div>
    );
  };

  return (
    <div className={`w-full h-dvh bg-black text-white flex flex-col items-center font-mono relative overflow-hidden select-none touch-none ${shake ? 'anim-shake' : ''} ${hudFlash ? 'hud-flash' : ''} max-w-md mx-auto`}>
      <div className="scanline"></div>

      {/* HEADER SECTION (Strictly optimized for Vertical) */}
      <div className="w-full flex-shrink-0 p-4 pb-2 z-10 antialiased flex justify-between items-start pt-6">
        <div className="space-y-1 w-1/3">
          <div className="metadata">SYSTEM_CLOCK</div>
          <SystemClock />
        </div>

        <div className="w-1/3 flex flex-col items-center relative -mt-2">
            <span className="metadata absolute -top-4 bg-black px-1 z-10 w-max">NEXT_MEM</span>
            <div className="visor w-16 h-16 sm:w-20 sm:h-20 bg-black/50">
                <div className="z-10 bg-black/90 p-1 rounded-full">{renderNextPiece()}</div>
            </div>
            <span className="metadata absolute -bottom-3 w-max">BUFFER_{String(level).padStart(2, '0')}</span>
        </div>

        <div className="space-y-1 w-1/3 text-right">
          <div className="metadata">BYTE_COUNT</div>
          <div className="text-xs sm:text-sm font-bold tracking-[0.2em] leading-none">[{String(score).padStart(6, '0')}]</div>
        </div>
      </div>

      {/* PLAYFIELD SECTION */}
      <div className="flex-1 w-full flex items-center justify-center min-h-0 relative z-10 px-4 mt-2">
        <div className="h-full aspect-[10/20] max-w-full relative border-2 border-white bg-black grid-bg flex-shrink-0">
          <div className="corner corner-tl z-20"></div>
          <div className="corner corner-tr z-20"></div>
          <div className="corner corner-bl z-20"></div>
          <div className="corner corner-br z-20"></div>

          <div className={`w-full h-full absolute inset-0 z-10 grid gap-0 ${dropFlash ? 'anim-drop-flash' : ''}`} style={{ gridTemplateColumns: 'repeat(10, 1fr)', gridTemplateRows: 'repeat(20, 1fr)' }}>
            {renderBoardGrid()}
          </div>

          {gameOver && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 text-center p-4">
              <span className="text-red-500 font-bold tracking-widest text-xl glitch-flash mb-2 uppercase">FATAL_ERROR</span>
              <span className="text-white text-sm mt-2 font-bold uppercase tracking-[0.2em]">HEAP_OVERFLOW</span>
              <span className="metadata mt-1">// SYSTEM_HALTED //</span>
              <button 
                onClick={resetGame}
                className="mt-8 industrial-btn bg-white !text-black hover:bg-black hover:!text-white transition-colors"
                onTouchStart={resetGame}
              >
                REBOOT_SYSTEM()
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CONTROLS SECTION */}
      <div className="w-full flex-shrink-0 px-4 py-4 z-10 pb-8 sm:pb-12">
        <div className="metadata text-center mb-2">COMMAND_CENTER // TACTILE_INPUT_REQUIRED</div>
        
        <div className="grid grid-cols-3 gap-2 w-full h-36 sm:h-44">
            <button 
                className="col-span-3 industrial-btn active:bg-white active:!text-black transition-colors flex items-center justify-center tracking-widest text-sm sm:text-base"
                onPointerDown={(e) => { e.preventDefault(); rotate(); }}
            >
                [ ROTATE ]
            </button>
            
            <button 
                className="col-span-1 industrial-btn active:bg-white active:!text-black transition-colors flex items-center justify-center text-lg sm:text-xl font-black"
                {...leftHoldParams}
                style={{touchAction: 'manipulation'}}
            >
                {"<"}
            </button>
            
            <button 
                className="col-span-1 industrial-btn active:bg-white active:!text-black transition-colors flex items-center justify-center text-lg sm:text-xl font-black tracking-widest"
                {...fastDropParams}
            >
                DROP
            </button>
            
            <button 
                className="col-span-1 industrial-btn active:bg-white active:!text-black transition-colors flex items-center justify-center text-lg sm:text-xl font-black"
                {...rightHoldParams}
            >
                {">"}
            </button>

            <button 
                className="col-span-3 industrial-btn bg-white !text-black active:bg-black active:!text-white transition-colors flex flex-col items-center justify-center tracking-widest"
                onPointerDown={(e) => { e.preventDefault(); hardDrop(); }}
            >
                <span className="text-[10px] leading-none mb-1 font-black">INSTANT_GRAVITY</span>
            </button>
        </div>
      </div>
    </div>
  );
}


import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TetrominoType,
  RotationState,
  ActivePiece,
  BoardMatrix,
  GameStats,
  GameStatus,
  LastClearEvent,
} from './types/tetris';
import {
  BOARD_ROWS,
  BOARD_COLS,
  LOCK_DELAY_MS,
  MAX_LOCK_MOVES,
  TETROMINO_SHAPES,
  SRS_KICK_TABLE_JLSTZ,
  SRS_KICK_TABLE_I,
  getDropInterval,
  SCORE_SINGLE,
  SCORE_DOUBLE,
  SCORE_TRIPLE,
  SCORE_TETRIS,
  SCORE_TSPIN_MINI,
  SCORE_TSPIN_SINGLE,
  SCORE_TSPIN_DOUBLE,
  SCORE_TSPIN_TRIPLE,
  BACK_TO_BACK_MULTIPLIER,
} from './engine/tetrisConstants';
import { BagRandomizer } from './engine/bagRandomizer';
import { synthAudio } from './audio/synthAudio';
import { HoldPanel } from './components/HoldPanel';
import { NextQueuePanel } from './components/NextQueuePanel';
import { ScoreBoard } from './components/ScoreBoard';
import { GameBoard } from './components/GameBoard';
import { TouchControls } from './components/TouchControls';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';

const createEmptyBoard = (): BoardMatrix =>
  Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));

export default function App() {
  // Game State
  const [board, setBoard] = useState<BoardMatrix>(createEmptyBoard());
  const [currentPiece, setCurrentPiece] = useState<ActivePiece | null>(null);
  const [heldPiece, setHeldPiece] = useState<TetrominoType | null>(null);
  const [canHold, setCanHold] = useState<boolean>(true);
  const [nextQueue, setNextQueue] = useState<TetrominoType[]>([]);
  const [gameStatus, setGameStatus] = useState<GameStatus>('PLAYING');
  const [isMuted, setIsMuted] = useState<boolean>(synthAudio.getMuted());

  // Statistics
  const [stats, setStats] = useState<GameStats>(() => {
    let savedHighScore = 0;
    try {
      savedHighScore = parseInt(localStorage.getItem('sb_tetris_highscore') || '0', 10) || 0;
    } catch {}
    return {
      score: 0,
      highScore: savedHighScore,
      lines: 0,
      level: 0,
      combo: -1,
      maxCombo: 0,
      backToBack: false,
      b2bCount: 0,
      singles: 0,
      doubles: 0,
      triples: 0,
      tetrises: 0,
      tSpins: 0,
      piecesPlaced: 0,
      startTime: Date.now(),
      elapsedSeconds: 0,
    };
  });

  // Visual Effects State
  const [clearingLines, setClearingLines] = useState<number[]>([]);
  const [lockCells, setLockCells] = useState<{ x: number; y: number }[]>([]);
  const [dropFlash, setDropFlash] = useState<boolean>(false);
  const [shake, setShake] = useState<boolean>(false);
  const [hudFlash, setHudFlash] = useState<boolean>(false);
  const [lastClear, setLastClear] = useState<LastClearEvent | null>(null);
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);

  // Engine Refs
  const bagRef = useRef<BagRandomizer>(new BagRandomizer());
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const dropCounterRef = useRef<number>(0);
  const lockTimerRef = useRef<number>(0);
  const lockMovesRef = useRef<number>(0);
  const isLockingRef = useRef<boolean>(false);
  const isProcessingRef = useRef<boolean>(false);
  const lastMoveWasRotateRef = useRef<boolean>(false);

  // Synchronized stateRef to avoid stale closures in requestAnimationFrame loop
  const stateRef = useRef({
    board,
    currentPiece,
    heldPiece,
    canHold,
    nextQueue,
    gameStatus,
    stats,
    clearingLines,
  });

  useEffect(() => {
    stateRef.current = {
      board,
      currentPiece,
      heldPiece,
      canHold,
      nextQueue,
      gameStatus,
      stats,
      clearingLines,
    };
  }, [board, currentPiece, heldPiece, canHold, nextQueue, gameStatus, stats, clearingLines]);

  // Screen Shake Feedback
  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 150);
  }, []);

  // Collision Checking
  const checkCollision = useCallback(
    (pieceX: number, pieceY: number, matrix: number[][], currentBoard: BoardMatrix): boolean => {
      for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < matrix[y].length; x++) {
          if (matrix[y][x] !== 0) {
            const targetX = pieceX + x;
            const targetY = pieceY + y;
            if (
              targetX < 0 ||
              targetX >= BOARD_COLS ||
              targetY >= BOARD_ROWS ||
              (targetY >= 0 && currentBoard[targetY][targetX] !== null)
            ) {
              return true;
            }
          }
        }
      }
      return false;
    },
    []
  );

  // Calculate Ghost Piece Landing Y
  const calculateGhostY = useCallback(
    (piece: ActivePiece, currentBoard: BoardMatrix): number => {
      let ghostY = piece.y;
      while (!checkCollision(piece.x, ghostY + 1, piece.matrix, currentBoard)) {
        ghostY++;
      }
      return ghostY;
    },
    [checkCollision]
  );

  // Spawn New Piece from 7-Bag
  const spawnPiece = useCallback(
    (typeToSpawn?: TetrominoType, boardToCheck?: BoardMatrix): boolean => {
      const type = typeToSpawn || bagRef.current.next();
      setNextQueue(bagRef.current.peek(3));

      const rotation: RotationState = 0;
      const matrix = TETROMINO_SHAPES[type][rotation];
      const x = Math.floor((BOARD_COLS - matrix[0].length) / 2);
      const y = type === 'I' ? -1 : 0;
      const targetBoard = boardToCheck || stateRef.current.board;

      if (checkCollision(x, y, matrix, targetBoard)) {
        // Spawn collision -> Game Over
        setGameStatus('GAMEOVER');
        synthAudio.playGameOver();
        return false;
      }

      const newPiece: ActivePiece = { type, rotation, x, y, matrix };
      setCurrentPiece(newPiece);
      setCanHold(true);
      lockTimerRef.current = 0;
      lockMovesRef.current = 0;
      isLockingRef.current = false;
      lastMoveWasRotateRef.current = false;
      return true;
    },
    [checkCollision]
  );

  // Merge Locked Piece into Grid
  const mergePiece = useCallback(
    (piece: ActivePiece, currentBoard: BoardMatrix): BoardMatrix => {
      const newBoard = currentBoard.map((row) => [...row]);
      piece.matrix.forEach((row, y) => {
        row.forEach((val, x) => {
          if (val !== 0) {
            const bY = piece.y + y;
            const bX = piece.x + x;
            if (bY >= 0 && bY < BOARD_ROWS && bX >= 0 && bX < BOARD_COLS) {
              newBoard[bY][bX] = piece.type;
            }
          }
        });
      });
      return newBoard;
    },
    []
  );

  // Check for T-Spin (3-Corner Rule)
  const detectTSpin = useCallback(
    (piece: ActivePiece, currentBoard: BoardMatrix): { isTSpin: boolean; isMini: boolean } => {
      if (piece.type !== 'T' || !lastMoveWasRotateRef.current) {
        return { isTSpin: false, isMini: false };
      }

      // Check 4 diagonals around center of 3x3 T
      const corners = [
        [piece.x, piece.y],         // Top-Left
        [piece.x + 2, piece.y],     // Top-Right
        [piece.x, piece.y + 2],     // Bottom-Left
        [piece.x + 2, piece.y + 2], // Bottom-Right
      ];

      let occupiedCorners = 0;
      corners.forEach(([cx, cy]) => {
        if (
          cx < 0 ||
          cx >= BOARD_COLS ||
          cy >= BOARD_ROWS ||
          (cy >= 0 && currentBoard[cy][cx] !== null)
        ) {
          occupiedCorners++;
        }
      });

      if (occupiedCorners >= 3) {
        return { isTSpin: true, isMini: false };
      }
      return { isTSpin: false, isMini: false };
    },
    []
  );

  // Line Clear and Scoring Routine
  const clearLinesRoutine = useCallback(
    async (currentBoard: BoardMatrix, pieceLocked: ActivePiece) => {
      const fullRowIndices: number[] = [];
      currentBoard.forEach((row, y) => {
        if (row.every((cell) => cell !== null && cell !== 'ghost')) {
          fullRowIndices.push(y);
        }
      });

      const lineCount = fullRowIndices.length;
      const { isTSpin, isMini } = detectTSpin(pieceLocked, currentBoard);

      if (lineCount > 0) {
        setClearingLines(fullRowIndices);
        triggerShake();

        const isTetris = lineCount === 4;
        synthAudio.playLineClear(lineCount, isTetris, isTSpin);

        // Calculate Points & Bonuses
        setStats((prev) => {
          const currentLevel = prev.level;
          let basePoints = 0;
          let clearType: LastClearEvent['type'] = null;
          let isB2B = prev.backToBack;

          if (isTSpin) {
            if (lineCount === 1) {
              basePoints = SCORE_TSPIN_SINGLE * (currentLevel + 1);
              clearType = 'TSPIN_SINGLE';
            } else if (lineCount === 2) {
              basePoints = SCORE_TSPIN_DOUBLE * (currentLevel + 1);
              clearType = 'TSPIN_DOUBLE';
            } else if (lineCount === 3) {
              basePoints = SCORE_TSPIN_TRIPLE * (currentLevel + 1);
              clearType = 'TSPIN_TRIPLE';
            }
          } else if (isMini) {
            basePoints = SCORE_TSPIN_MINI * (currentLevel + 1);
            clearType = 'TSPIN_MINI';
          } else {
            if (lineCount === 1) {
              basePoints = SCORE_SINGLE * (currentLevel + 1);
              clearType = 'SINGLE';
            } else if (lineCount === 2) {
              basePoints = SCORE_DOUBLE * (currentLevel + 1);
              clearType = 'DOUBLE';
            } else if (lineCount === 3) {
              basePoints = SCORE_TRIPLE * (currentLevel + 1);
              clearType = 'TRIPLE';
            } else if (lineCount === 4) {
              basePoints = SCORE_TETRIS * (currentLevel + 1);
              clearType = 'TETRIS';
            }
          }

          const hardClear = isTetris || isTSpin;
          let b2bMultiplier = 1;
          if (hardClear && isB2B) {
            b2bMultiplier = BACK_TO_BACK_MULTIPLIER;
          }

          const newCombo = prev.combo + 1;
          const comboBonus = newCombo > 0 ? 50 * newCombo * (currentLevel + 1) : 0;
          const totalPoints = Math.floor(basePoints * b2bMultiplier) + comboBonus;

          const newScore = prev.score + totalPoints;
          const newLines = prev.lines + lineCount;
          const newLevel = Math.floor(newLines / 10);

          if (newLevel > prev.level) {
            synthAudio.playLevelUp();
          }

          const updatedHighScore = Math.max(prev.highScore, newScore);
          if (newScore > prev.highScore) {
            setIsNewHighScore(true);
            try {
              localStorage.setItem('sb_tetris_highscore', String(newScore));
            } catch {}
          }

          setLastClear({
            type: clearType,
            lines: lineCount,
            points: totalPoints,
            combo: newCombo,
            b2b: hardClear && isB2B,
            timestamp: Date.now(),
          });

          return {
            ...prev,
            score: newScore,
            highScore: updatedHighScore,
            lines: newLines,
            level: newLevel,
            combo: newCombo,
            maxCombo: Math.max(prev.maxCombo, newCombo),
            backToBack: hardClear,
            b2bCount: hardClear && isB2B ? prev.b2bCount + 1 : prev.b2bCount,
            singles: lineCount === 1 ? prev.singles + 1 : prev.singles,
            doubles: lineCount === 2 ? prev.doubles + 1 : prev.doubles,
            triples: lineCount === 3 ? prev.triples + 1 : prev.triples,
            tetrises: lineCount === 4 ? prev.tetrises + 1 : prev.tetrises,
            tSpins: isTSpin ? prev.tSpins + 1 : prev.tSpins,
            piecesPlaced: prev.piecesPlaced + 1,
          };
        });

        // Clear animation delay
        await new Promise((resolve) => setTimeout(resolve, 220));

        const updatedBoard = currentBoard.filter((_, idx) => !fullRowIndices.includes(idx));
        while (updatedBoard.length < BOARD_ROWS) {
          updatedBoard.unshift(Array(BOARD_COLS).fill(null));
        }

        setClearingLines([]);
        return updatedBoard;
      } else {
        // Combo reset if no lines cleared
        setStats((prev) => ({
          ...prev,
          combo: -1,
          piecesPlaced: prev.piecesPlaced + 1,
        }));
        return currentBoard;
      }
    },
    [detectTSpin, triggerShake]
  );

  // Lock Active Piece
  const lockPiece = useCallback(
    async (pieceToLock: ActivePiece) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      synthAudio.playLock();

      const coords: { x: number; y: number }[] = [];
      pieceToLock.matrix.forEach((row, y) =>
        row.forEach((val, x) => {
          if (val !== 0) coords.push({ x: pieceToLock.x + x, y: pieceToLock.y + y });
        })
      );
      setLockCells(coords);
      setTimeout(() => setLockCells([]), 250);

      const merged = mergePiece(pieceToLock, stateRef.current.board);
      setBoard(merged);
      setCurrentPiece(null);

      const cleanedBoard = await clearLinesRoutine(merged, pieceToLock);

      if (stateRef.current.gameStatus !== 'GAMEOVER') {
        setBoard(cleanedBoard);
        spawnPiece();
      }
      isProcessingRef.current = false;
    },
    [mergePiece, clearLinesRoutine, spawnPiece]
  );

  // Move Left
  const moveLeft = useCallback(() => {
    const { currentPiece, board, gameStatus } = stateRef.current;
    if (gameStatus !== 'PLAYING' || !currentPiece || isProcessingRef.current) return;

    if (!checkCollision(currentPiece.x - 1, currentPiece.y, currentPiece.matrix, board)) {
      setCurrentPiece({ ...currentPiece, x: currentPiece.x - 1 });
      synthAudio.playMove();
      lastMoveWasRotateRef.current = false;

      // Lock delay extension on valid movement
      if (isLockingRef.current && lockMovesRef.current < MAX_LOCK_MOVES) {
        lockTimerRef.current = 0;
        lockMovesRef.current++;
      }
    }
  }, [checkCollision]);

  // Move Right
  const moveRight = useCallback(() => {
    const { currentPiece, board, gameStatus } = stateRef.current;
    if (gameStatus !== 'PLAYING' || !currentPiece || isProcessingRef.current) return;

    if (!checkCollision(currentPiece.x + 1, currentPiece.y, currentPiece.matrix, board)) {
      setCurrentPiece({ ...currentPiece, x: currentPiece.x + 1 });
      synthAudio.playMove();
      lastMoveWasRotateRef.current = false;

      // Lock delay extension on valid movement
      if (isLockingRef.current && lockMovesRef.current < MAX_LOCK_MOVES) {
        lockTimerRef.current = 0;
        lockMovesRef.current++;
      }
    }
  }, [checkCollision]);

  // Soft Drop (Down)
  const softDrop = useCallback(() => {
    const { currentPiece, board, gameStatus } = stateRef.current;
    if (gameStatus !== 'PLAYING' || !currentPiece || isProcessingRef.current) return;

    if (!checkCollision(currentPiece.x, currentPiece.y + 1, currentPiece.matrix, board)) {
      setCurrentPiece({ ...currentPiece, y: currentPiece.y + 1 });
      setStats((prev) => ({ ...prev, score: prev.score + 1 }));
      lastMoveWasRotateRef.current = false;
      dropCounterRef.current = 0;
    } else {
      isLockingRef.current = true;
    }
  }, [checkCollision]);

  // Super Rotation System (SRS) - Clockwise (CW)
  const rotateCW = useCallback(() => {
    const { currentPiece, board, gameStatus } = stateRef.current;
    if (gameStatus !== 'PLAYING' || !currentPiece || isProcessingRef.current) return;

    if (currentPiece.type === 'O') return; // O piece does not rotate

    const currentRotation = currentPiece.rotation;
    const nextRotation = ((currentRotation + 1) % 4) as RotationState;
    const nextMatrix = TETROMINO_SHAPES[currentPiece.type][nextRotation];
    const kickKey = `${currentRotation}->${nextRotation}`;
    const kickTable =
      currentPiece.type === 'I' ? SRS_KICK_TABLE_I[kickKey] : SRS_KICK_TABLE_JLSTZ[kickKey];

    if (!kickTable) return;

    for (const [kx, ky] of kickTable) {
      const targetX = currentPiece.x + kx;
      const targetY = currentPiece.y - ky; // SRS kick table +y is UP in grid coords

      if (!checkCollision(targetX, targetY, nextMatrix, board)) {
        setCurrentPiece({
          ...currentPiece,
          rotation: nextRotation,
          matrix: nextMatrix,
          x: targetX,
          y: targetY,
        });
        synthAudio.playRotate();
        setHudFlash(true);
        setTimeout(() => setHudFlash(false), 80);
        lastMoveWasRotateRef.current = true;

        // Reset lock timer on successful rotation
        if (isLockingRef.current && lockMovesRef.current < MAX_LOCK_MOVES) {
          lockTimerRef.current = 0;
          lockMovesRef.current++;
        }
        return;
      }
    }
  }, [checkCollision]);

  // Super Rotation System (SRS) - Counter-Clockwise (CCW)
  const rotateCCW = useCallback(() => {
    const { currentPiece, board, gameStatus } = stateRef.current;
    if (gameStatus !== 'PLAYING' || !currentPiece || isProcessingRef.current) return;

    if (currentPiece.type === 'O') return;

    const currentRotation = currentPiece.rotation;
    const nextRotation = ((currentRotation + 3) % 4) as RotationState;
    const nextMatrix = TETROMINO_SHAPES[currentPiece.type][nextRotation];
    const kickKey = `${currentRotation}->${nextRotation}`;
    const kickTable =
      currentPiece.type === 'I' ? SRS_KICK_TABLE_I[kickKey] : SRS_KICK_TABLE_JLSTZ[kickKey];

    if (!kickTable) return;

    for (const [kx, ky] of kickTable) {
      const targetX = currentPiece.x + kx;
      const targetY = currentPiece.y - ky;

      if (!checkCollision(targetX, targetY, nextMatrix, board)) {
        setCurrentPiece({
          ...currentPiece,
          rotation: nextRotation,
          matrix: nextMatrix,
          x: targetX,
          y: targetY,
        });
        synthAudio.playRotate();
        setHudFlash(true);
        setTimeout(() => setHudFlash(false), 80);
        lastMoveWasRotateRef.current = true;

        if (isLockingRef.current && lockMovesRef.current < MAX_LOCK_MOVES) {
          lockTimerRef.current = 0;
          lockMovesRef.current++;
        }
        return;
      }
    }
  }, [checkCollision]);

  // Instant Gravity (Hard Drop)
  const hardDrop = useCallback(() => {
    const { currentPiece, board, gameStatus } = stateRef.current;
    if (gameStatus !== 'PLAYING' || !currentPiece || isProcessingRef.current) return;

    const ghostY = calculateGhostY(currentPiece, board);
    const droppedDistance = ghostY - currentPiece.y;

    triggerShake();
    setDropFlash(true);
    setTimeout(() => setDropFlash(false), 120);
    synthAudio.playHardDrop();

    setStats((prev) => ({
      ...prev,
      score: prev.score + Math.max(0, droppedDistance * 2),
    }));

    const droppedPiece = { ...currentPiece, y: ghostY };
    setCurrentPiece(droppedPiece);
    lockPiece(droppedPiece);
  }, [calculateGhostY, triggerShake, lockPiece]);

  // Hold Piece Action
  const holdCurrentPiece = useCallback(() => {
    const { currentPiece, heldPiece, canHold, gameStatus } = stateRef.current;
    if (gameStatus !== 'PLAYING' || !currentPiece || !canHold || isProcessingRef.current) return;

    synthAudio.playHold();
    setCanHold(false);
    const pieceTypeToHold = currentPiece.type;

    if (heldPiece === null) {
      setHeldPiece(pieceTypeTypeOrNull(pieceTypeToHold));
      spawnPiece();
    } else {
      setHeldPiece(pieceTypeTypeOrNull(pieceTypeToHold));
      spawnPiece(heldPiece);
    }
  }, [spawnPiece]);

  function pieceTypeTypeOrNull(type: TetrominoType): TetrominoType {
    return type;
  }

  // Toggle Pause
  const togglePause = useCallback(() => {
    setGameStatus((prev) => {
      if (prev === 'PLAYING') return 'PAUSED';
      if (prev === 'PAUSED') return 'PLAYING';
      return prev;
    });
  }, []);

  // Toggle Sound Mute
  const handleToggleMute = useCallback(() => {
    const muted = synthAudio.toggleMute();
    setIsMuted(muted);
  }, []);

  // Reset / Restart Game
  const resetGame = useCallback(() => {
    const empty = createEmptyBoard();
    bagRef.current.reset();
    setBoard(empty);
    setCurrentPiece(null);
    setHeldPiece(null);
    setCanHold(true);
    setNextQueue(bagRef.current.peek(3));
    setGameStatus('PLAYING');
    setClearingLines([]);
    setLockCells([]);
    setLastClear(null);
    setIsNewHighScore(false);
    isProcessingRef.current = false;
    dropCounterRef.current = 0;
    lockTimerRef.current = 0;
    lockMovesRef.current = 0;
    isLockingRef.current = false;

    setStats((prev) => ({
      score: 0,
      highScore: prev.highScore,
      lines: 0,
      level: 0,
      combo: -1,
      maxCombo: 0,
      backToBack: false,
      b2bCount: 0,
      singles: 0,
      doubles: 0,
      triples: 0,
      tetrises: 0,
      tSpins: 0,
      piecesPlaced: 0,
      startTime: Date.now(),
      elapsedSeconds: 0,
    }));

    spawnPiece(undefined, empty);
  }, [spawnPiece]);

  // Master Keyboard Event Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default page scroll on game keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Tab'].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        togglePause();
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        handleToggleMute();
        return;
      }

      if (stateRef.current.gameStatus !== 'PLAYING' || isProcessingRef.current) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          moveLeft();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          moveRight();
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          softDrop();
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
        case 'x':
        case 'X':
          rotateCW();
          break;
        case 'z':
        case 'Z':
          rotateCCW();
          break;
        case ' ':
          hardDrop();
          break;
        case 'c':
        case 'C':
        case 'Shift':
          holdCurrentPiece();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveLeft, moveRight, softDrop, rotateCW, rotateCCW, hardDrop, holdCurrentPiece, togglePause, handleToggleMute]);

  // Main 60 FPS Game Loop
  const gameLoop = useCallback(
    (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;

      const { gameStatus, currentPiece, board, stats } = stateRef.current;

      if (gameStatus === 'PLAYING' && !isProcessingRef.current) {
        // Track uptime
        setStats((prev) => ({
          ...prev,
          elapsedSeconds: Math.floor((Date.now() - prev.startTime) / 1000),
        }));

        if (!currentPiece) {
          spawnPiece();
        } else {
          const isTouchingBottom = checkCollision(
            currentPiece.x,
            currentPiece.y + 1,
            currentPiece.matrix,
            board
          );

          if (isTouchingBottom) {
            isLockingRef.current = true;
            lockTimerRef.current += deltaTime;

            if (lockTimerRef.current >= LOCK_DELAY_MS) {
              lockPiece(currentPiece);
            }
          } else {
            isLockingRef.current = false;
            lockTimerRef.current = 0;
            dropCounterRef.current += deltaTime;

            const currentInterval = getDropInterval(stats.level);
            if (dropCounterRef.current >= currentInterval) {
              dropCounterRef.current = 0;
              if (!checkCollision(currentPiece.x, currentPiece.y + 1, currentPiece.matrix, board)) {
                setCurrentPiece({ ...currentPiece, y: currentPiece.y + 1 });
                lastMoveWasRotateRef.current = false;
              }
            }
          }
        }
      }

      requestRef.current = requestAnimationFrame(gameLoop);
    },
    [checkCollision, lockPiece, spawnPiece]
  );

  // Mount & Initial Spawn
  useEffect(() => {
    setNextQueue(bagRef.current.peek(3));
    spawnPiece();
    requestRef.current = requestAnimationFrame(gameLoop);

    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  const ghostY =
    currentPiece && !isProcessingRef.current
      ? calculateGhostY(currentPiece, board)
      : -1;

  return (
    <div
      className={`w-full h-dvh bg-black text-white flex flex-col items-center justify-between font-mono relative overflow-hidden select-none touch-none ${
        shake ? 'anim-shake' : ''
      } ${hudFlash ? 'hud-flash' : ''} max-w-md mx-auto`}
    >
      <div className="scanline"></div>

      {/* HEADER & SCORE TELEMETRY */}
      <div className="w-full flex-shrink-0 px-3 pt-3 pb-1 z-20">
        <ScoreBoard
          stats={stats}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onPause={togglePause}
          isPaused={gameStatus === 'PAUSED'}
        />
      </div>

      {/* MAIN PLAYFIELD & SIDE PANELS (Vertical Ergonomic Layout) */}
      <div className="flex-1 w-full min-h-0 flex items-center justify-center gap-2 px-2 z-10">
        {/* Left Side: Hold Panel */}
        <div className="flex flex-col items-center justify-start h-full pt-2">
          <HoldPanel heldPiece={heldPiece} canHold={canHold} onHoldClick={holdCurrentPiece} />
        </div>

        {/* Center: 10x20 Game Board */}
        <div className="h-full flex items-center justify-center flex-1 min-w-0 max-w-full">
          <GameBoard
            board={board}
            currentPiece={currentPiece}
            ghostY={ghostY}
            clearingLines={clearingLines}
            lockCells={lockCells}
            dropFlash={dropFlash}
            lastClear={lastClear}
          />
        </div>

        {/* Right Side: Next Queue Panel */}
        <div className="flex flex-col items-center justify-start h-full pt-2">
          <NextQueuePanel queue={nextQueue} />
        </div>
      </div>

      {/* TACTILE TOUCH CONTROLS (Ergonomic for vertical screens) */}
      <TouchControls
        onMoveLeft={moveLeft}
        onMoveRight={moveRight}
        onSoftDrop={softDrop}
        onHardDrop={hardDrop}
        onRotateCW={rotateCW}
        onRotateCCW={rotateCCW}
        onHold={holdCurrentPiece}
        disabled={gameStatus !== 'PLAYING'}
      />

      {/* MODALS */}
      {gameStatus === 'PAUSED' && (
        <PauseModal
          onResume={togglePause}
          onRestart={resetGame}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {gameStatus === 'GAMEOVER' && (
        <GameOverModal
          stats={stats}
          isNewHighScore={isNewHighScore}
          onRestart={resetGame}
        />
      )}
    </div>
  );
}

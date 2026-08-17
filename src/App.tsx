import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TetrominoType,
  RotationState,
  ActivePiece,
  BoardMatrix,
  GameStats,
  GameStatus,
  GameMode,
  HandlingSettings,
  CareerStats,
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
  SRS_KICK_TABLE_180,
  getDropInterval,
  SCORE_SINGLE,
  SCORE_DOUBLE,
  SCORE_TRIPLE,
  SCORE_TETRIS,
  SCORE_TSPIN_MINI,
  SCORE_TSPIN_SINGLE,
  SCORE_TSPIN_DOUBLE,
  SCORE_TSPIN_TRIPLE,
  SCORE_PERFECT_CLEAR_SINGLE,
  SCORE_PERFECT_CLEAR_DOUBLE,
  SCORE_PERFECT_CLEAR_TRIPLE,
  SCORE_PERFECT_CLEAR_TETRIS,
  SCORE_PERFECT_CLEAR_B2B_TETRIS,
  BACK_TO_BACK_MULTIPLIER,
  DEFAULT_DAS_MS,
  DEFAULT_ARR_MS,
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
import { SettingsModal } from './components/SettingsModal';
import { StatsModal } from './components/StatsModal';
import { MainMenu } from './components/MainMenu';

const createEmptyBoard = (): BoardMatrix =>
  Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));

const DEFAULT_CAREER_STATS: CareerStats = {
  gamesPlayed: 0,
  totalLines: 0,
  totalScore: 0,
  totalTetrises: 0,
  totalTSpins: 0,
  totalPerfectClears: 0,
  totalPiecesPlaced: 0,
  maxComboEver: 0,
  bestSprintMs: 0,
  bestBlitzScore: 0,
  marathonHighScore: 0,
};

export default function App() {
  // Navigation & Status
  const [gameStatus, setGameStatus] = useState<GameStatus>('MENU');

  // Game Mode
  const [gameMode, setGameMode] = useState<GameMode>(() => {
    try {
      const saved = localStorage.getItem('naga_tetris_mode');
      if (saved === 'MARATHON' || saved === 'SPRINT' || saved === 'BLITZ' || saved === 'ZEN') {
        return saved;
      }
    } catch {}
    return 'MARATHON';
  });

  // Handling Settings (DAS / ARR)
  const [settings, setSettings] = useState<HandlingSettings>(() => {
    try {
      const saved = localStorage.getItem('naga_tetris_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      dasMs: DEFAULT_DAS_MS,
      arrMs: DEFAULT_ARR_MS,
      softDropInstant: false,
      vibrateEnabled: true,
      swipeEnabled: true,
    };
  });

  // Career Statistics Database
  const [careerStats, setCareerStats] = useState<CareerStats>(() => {
    try {
      const saved = localStorage.getItem('naga_career_stats');
      if (saved) return { ...DEFAULT_CAREER_STATS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_CAREER_STATS;
  });

  // Modal Visibility
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);

  // Core Game State
  const [board, setBoard] = useState<BoardMatrix>(createEmptyBoard());
  const [currentPiece, setCurrentPiece] = useState<ActivePiece | null>(null);
  const [heldPiece, setHeldPiece] = useState<TetrominoType | null>(null);
  const [canHold, setCanHold] = useState<boolean>(true);
  const [nextQueue, setNextQueue] = useState<TetrominoType[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(synthAudio.getMuted());

  // Mode Specific Timers
  const [sprintElapsedMs, setSprintElapsedMs] = useState<number>(0);
  const [blitzRemainingMs, setBlitzRemainingMs] = useState<number>(120000);
  const [isNewBestSprint, setIsNewBestSprint] = useState<boolean>(false);
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);

  // Current Session Statistics
  const [stats, setStats] = useState<GameStats>(() => ({
    score: 0,
    highScore: careerStats.marathonHighScore,
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
    perfectClears: 0,
    piecesPlaced: 0,
    startTime: Date.now(),
    elapsedSeconds: 0,
    mode: gameMode,
    bestSprintMs: careerStats.bestSprintMs,
    bestBlitzScore: careerStats.bestBlitzScore,
    pps: 0,
  }));

  // Visual Effects State
  const [clearingLines, setClearingLines] = useState<number[]>([]);
  const [lockCells, setLockCells] = useState<{ x: number; y: number }[]>([]);
  const [dropFlash, setDropFlash] = useState<boolean>(false);
  const [shake, setShake] = useState<boolean>(false);
  const [hudFlash, setHudFlash] = useState<boolean>(false);
  const [lastClear, setLastClear] = useState<LastClearEvent | null>(null);

  // Engine Refs
  const bagRef = useRef<BagRandomizer>(new BagRandomizer());
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const dropCounterRef = useRef<number>(0);
  const lockTimerRef = useRef<number>(0);
  const lockMovesRef = useRef<number>(0);
  const lowestYRef = useRef<number>(0);
  const isLockingRef = useRef<boolean>(false);
  const isProcessingRef = useRef<boolean>(false);
  const lastMoveWasRotateRef = useRef<boolean>(false);
  const lastKickIndexRef = useRef<number>(-1);

  // Touch gesture tracker
  const touchStartPos = useRef<{ x: number; y: number; time: number } | null>(null);

  // Synchronized stateRef to avoid stale closures in requestAnimationFrame loop
  const stateRef = useRef({
    board,
    currentPiece,
    heldPiece,
    canHold,
    nextQueue,
    gameStatus,
    stats,
    gameMode,
    clearingLines,
    careerStats,
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
      gameMode,
      clearingLines,
      careerStats,
    };
  }, [
    board,
    currentPiece,
    heldPiece,
    canHold,
    nextQueue,
    gameStatus,
    stats,
    gameMode,
    clearingLines,
    careerStats,
  ]);

  // Persist Career Stats Helper
  const recordCareerProgress = useCallback((finalSessionStats: GameStats) => {
    setCareerStats((prev) => {
      const updated: CareerStats = {
        gamesPlayed: prev.gamesPlayed + 1,
        totalLines: prev.totalLines + finalSessionStats.lines,
        totalScore: prev.totalScore + finalSessionStats.score,
        totalTetrises: prev.totalTetrises + finalSessionStats.tetrises,
        totalTSpins: prev.totalTSpins + finalSessionStats.tSpins,
        totalPerfectClears: prev.totalPerfectClears + finalSessionStats.perfectClears,
        totalPiecesPlaced: prev.totalPiecesPlaced + finalSessionStats.piecesPlaced,
        maxComboEver: Math.max(prev.maxComboEver, finalSessionStats.maxCombo),
        marathonHighScore:
          finalSessionStats.mode === 'MARATHON'
            ? Math.max(prev.marathonHighScore, finalSessionStats.score)
            : prev.marathonHighScore,
        bestSprintMs:
          finalSessionStats.mode === 'SPRINT' && finalSessionStats.sprintTimeMs
            ? prev.bestSprintMs === 0
              ? finalSessionStats.sprintTimeMs
              : Math.min(prev.bestSprintMs, finalSessionStats.sprintTimeMs)
            : prev.bestSprintMs,
        bestBlitzScore:
          finalSessionStats.mode === 'BLITZ'
            ? Math.max(prev.bestBlitzScore, finalSessionStats.score)
            : prev.bestBlitzScore,
      };

      try {
        localStorage.setItem('naga_career_stats', JSON.stringify(updated));
        if (updated.marathonHighScore > 0) {
          localStorage.setItem('sb_tetris_highscore', String(updated.marathonHighScore));
        }
      } catch {}
      return updated;
    });
  }, []);

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
      setNextQueue(bagRef.current.peek(5));

      const rotation: RotationState = 0;
      const matrix = TETROMINO_SHAPES[type][rotation];
      const x = Math.floor((BOARD_COLS - matrix[0].length) / 2);
      const y = type === 'I' ? -1 : 0;
      const targetBoard = boardToCheck || stateRef.current.board;

      if (checkCollision(x, y, matrix, targetBoard)) {
        if (stateRef.current.gameMode === 'ZEN') {
          // Zen mode sandbox: clear half board to allow continuous practice
          const sanitized = targetBoard.map((row, rIdx) =>
            rIdx >= 10 ? Array(BOARD_COLS).fill(null) : row
          );
          setBoard(sanitized);
        } else {
          // Spawn collision -> Game Over
          setGameStatus('GAMEOVER');
          synthAudio.playGameOver();
          recordCareerProgress(stateRef.current.stats);
          return false;
        }
      }

      const newPiece: ActivePiece = { type, rotation, x, y, matrix };
      setCurrentPiece(newPiece);
      setCanHold(true);
      lockTimerRef.current = 0;
      lockMovesRef.current = 0;
      lowestYRef.current = y;
      isLockingRef.current = false;
      lastMoveWasRotateRef.current = false;
      lastKickIndexRef.current = -1;
      return true;
    },
    [checkCollision, recordCareerProgress]
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

  // Meticulous T-Spin Classifier (3-Corner Rule + Front/Back Corner + 5th Kick Override)
  const detectTSpin = useCallback(
    (piece: ActivePiece, currentBoard: BoardMatrix): { isTSpin: boolean; isMini: boolean } => {
      if (piece.type !== 'T' || !lastMoveWasRotateRef.current) {
        return { isTSpin: false, isMini: false };
      }

      // Center of 3x3 T piece
      const cx = piece.x + 1;
      const cy = piece.y + 1;

      // 4 diagonal corners around center: [TL, TR, BL, BR]
      const cornerCoords = {
        TL: [cx - 1, cy - 1],
        TR: [cx + 1, cy - 1],
        BL: [cx - 1, cy + 1],
        BR: [cx + 1, cy + 1],
      };

      const isCornerOccupied = ([x, y]: number[]) => {
        if (x < 0 || x >= BOARD_COLS || y >= BOARD_ROWS || (y >= 0 && currentBoard[y][x] !== null)) {
          return true;
        }
        return false;
      };

      const occupied = {
        TL: isCornerOccupied(cornerCoords.TL),
        TR: isCornerOccupied(cornerCoords.TR),
        BL: isCornerOccupied(cornerCoords.BL),
        BR: isCornerOccupied(cornerCoords.BR),
      };

      const totalOccupied =
        (occupied.TL ? 1 : 0) +
        (occupied.TR ? 1 : 0) +
        (occupied.BL ? 1 : 0) +
        (occupied.BR ? 1 : 0);

      if (totalOccupied < 3) {
        return { isTSpin: false, isMini: false };
      }

      // Determine Front vs Back Corners based on T orientation
      let frontCorners = 0;
      switch (piece.rotation) {
        case 0: // Pointing UP (TL & TR are front)
          if (occupied.TL) frontCorners++;
          if (occupied.TR) frontCorners++;
          break;
        case 1: // Pointing RIGHT (TR & BR are front)
          if (occupied.TR) frontCorners++;
          if (occupied.BR) frontCorners++;
          break;
        case 2: // Pointing DOWN (BL & BR are front)
          if (occupied.BL) frontCorners++;
          if (occupied.BR) frontCorners++;
          break;
        case 3: // Pointing LEFT (TL & BL are front)
          if (occupied.TL) frontCorners++;
          if (occupied.BL) frontCorners++;
          break;
      }

      // If both front corners are occupied -> Regular T-Spin
      if (frontCorners === 2) {
        return { isTSpin: true, isMini: false };
      }

      // If only 1 front corner is occupied:
      // If the 5th kick (index 4) was used -> Regular T-Spin (TST kick override)
      if (lastKickIndexRef.current === 4) {
        return { isTSpin: true, isMini: false };
      }

      // Otherwise -> T-Spin Mini
      return { isTSpin: false, isMini: true };
    },
    []
  );

  // Line Clear, Perfect Clear & Scoring Routine
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

        // Pre-compute board without cleared rows to check for Perfect Clear (All Clear)
        const candidateBoard = currentBoard.filter((_, idx) => !fullRowIndices.includes(idx));
        const isPerfectClear = candidateBoard.every((row) =>
          row.every((cell) => cell === null || cell === 'ghost')
        );

        if (isPerfectClear) {
          synthAudio.playPerfectClear();
        }

        // Calculate Points & Bonuses
        setStats((prev) => {
          const currentLevel = prev.level;
          let basePoints = 0;
          let clearType: LastClearEvent['type'] = null;
          const isB2B = prev.backToBack;

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

          // Perfect Clear Bonus
          let pcBonus = 0;
          if (isPerfectClear) {
            if (lineCount === 1) pcBonus = SCORE_PERFECT_CLEAR_SINGLE * (currentLevel + 1);
            else if (lineCount === 2) pcBonus = SCORE_PERFECT_CLEAR_DOUBLE * (currentLevel + 1);
            else if (lineCount === 3) pcBonus = SCORE_PERFECT_CLEAR_TRIPLE * (currentLevel + 1);
            else if (lineCount === 4)
              pcBonus =
                (isB2B ? SCORE_PERFECT_CLEAR_B2B_TETRIS : SCORE_PERFECT_CLEAR_TETRIS) *
                (currentLevel + 1);
          }

          const hardClear = isTetris || isTSpin;
          let b2bMultiplier = 1;
          if (hardClear && isB2B) {
            b2bMultiplier = BACK_TO_BACK_MULTIPLIER;
          }

          const newCombo = prev.combo + 1;
          if (newCombo > 0) {
            synthAudio.playCombo(newCombo);
          }

          const comboBonus = newCombo > 0 ? 50 * newCombo * (currentLevel + 1) : 0;
          const totalPoints = Math.floor(basePoints * b2bMultiplier) + comboBonus + pcBonus;

          const newScore = prev.score + totalPoints;
          const newLines = prev.lines + lineCount;
          const newLevel = Math.floor(newLines / 10);

          if (newLevel > prev.level) {
            synthAudio.playLevelUp();
          }

          const updatedHighScore = Math.max(prev.highScore, newScore);
          if (newScore > prev.highScore) {
            setIsNewHighScore(true);
          }

          // 40-Line Sprint Completion Check
          if (prev.mode === 'SPRINT' && newLines >= 40) {
            const sprintTime = Date.now() - prev.startTime;
            setGameStatus('VICTORY');
            synthAudio.playVictory();

            if (!prev.bestSprintMs || sprintTime < prev.bestSprintMs) {
              setIsNewBestSprint(true);
            }
          }

          const updatedStats: GameStats = {
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
            perfectClears: isPerfectClear ? prev.perfectClears + 1 : prev.perfectClears,
            piecesPlaced: prev.piecesPlaced + 1,
            sprintTimeMs: prev.mode === 'SPRINT' ? Date.now() - prev.startTime : undefined,
          };

          if (prev.mode === 'SPRINT' && newLines >= 40) {
            recordCareerProgress(updatedStats);
          }

          setLastClear({
            type: isPerfectClear ? 'PERFECT_CLEAR' : clearType,
            lines: lineCount,
            points: totalPoints,
            combo: newCombo,
            b2b: hardClear && isB2B,
            isPerfectClear,
            timestamp: Date.now(),
          });

          return updatedStats;
        });

        // Clear animation delay
        await new Promise((resolve) => setTimeout(resolve, 200));

        const updatedBoard = currentBoard.filter((_, idx) => !fullRowIndices.includes(idx));
        while (updatedBoard.length < BOARD_ROWS) {
          updatedBoard.unshift(Array(BOARD_COLS).fill(null));
        }

        setClearingLines([]);
        return updatedBoard;
      } else {
        // T-Spin Zero check (T-Spin with 0 lines cleared)
        if (isTSpin) {
          synthAudio.playLineClear(0, false, true);
          setStats((prev) => ({
            ...prev,
            score: prev.score + SCORE_TSPIN_MINI * (prev.level + 1),
            tSpins: prev.tSpins + 1,
            combo: -1,
            piecesPlaced: prev.piecesPlaced + 1,
          }));
          setLastClear({
            type: 'TSPIN_MINI',
            lines: 0,
            points: SCORE_TSPIN_MINI * (stateRef.current.stats.level + 1),
            combo: 0,
            b2b: false,
            timestamp: Date.now(),
          });
        } else {
          // Combo reset if no lines cleared
          setStats((prev) => ({
            ...prev,
            combo: -1,
            piecesPlaced: prev.piecesPlaced + 1,
          }));
        }
        return currentBoard;
      }
    },
    [detectTSpin, triggerShake, recordCareerProgress]
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
      setTimeout(() => setLockCells([]), 220);

      const merged = mergePiece(pieceToLock, stateRef.current.board);
      setBoard(merged);
      setCurrentPiece(null);

      const cleanedBoard = await clearLinesRoutine(merged, pieceToLock);

      if (stateRef.current.gameStatus === 'PLAYING') {
        setBoard(cleanedBoard);
        spawnPiece();
      }
      isProcessingRef.current = false;
    },
    [mergePiece, clearLinesRoutine, spawnPiece]
  );

  // Extended Placement Lock Reset Helper (Guideline Move Reset)
  const handlePlacementMoveReset = useCallback((newY: number) => {
    if (newY > lowestYRef.current) {
      // Piece reached a strictly lower row -> Reset lock timer AND move count!
      lowestYRef.current = newY;
      lockMovesRef.current = 0;
      lockTimerRef.current = 0;
    } else {
      // Piece at same or higher elevation -> Reset timer up to MAX_LOCK_MOVES
      if (lockMovesRef.current < MAX_LOCK_MOVES) {
        lockMovesRef.current++;
        lockTimerRef.current = 0;
      }
    }
  }, []);

  // Move Left
  const moveLeft = useCallback(() => {
    const { currentPiece, board, gameStatus } = stateRef.current;
    if (gameStatus !== 'PLAYING' || !currentPiece || isProcessingRef.current) return;

    if (!checkCollision(currentPiece.x - 1, currentPiece.y, currentPiece.matrix, board)) {
      setCurrentPiece({ ...currentPiece, x: currentPiece.x - 1 });
      synthAudio.playMove();
      lastMoveWasRotateRef.current = false;

      if (isLockingRef.current) {
        handlePlacementMoveReset(currentPiece.y);
      }
    }
  }, [checkCollision, handlePlacementMoveReset]);

  // Move Right
  const moveRight = useCallback(() => {
    const { currentPiece, board, gameStatus } = stateRef.current;
    if (gameStatus !== 'PLAYING' || !currentPiece || isProcessingRef.current) return;

    if (!checkCollision(currentPiece.x + 1, currentPiece.y, currentPiece.matrix, board)) {
      setCurrentPiece({ ...currentPiece, x: currentPiece.x + 1 });
      synthAudio.playMove();
      lastMoveWasRotateRef.current = false;

      if (isLockingRef.current) {
        handlePlacementMoveReset(currentPiece.y);
      }
    }
  }, [checkCollision, handlePlacementMoveReset]);

  // Soft Drop / Sonic Drop
  const softDrop = useCallback(() => {
    const { currentPiece, board, gameStatus } = stateRef.current;
    if (gameStatus !== 'PLAYING' || !currentPiece || isProcessingRef.current) return;

    if (settings.softDropInstant) {
      // Sonic Drop (instant drop to bottom without immediate lock)
      const ghostY = calculateGhostY(currentPiece, board);
      if (ghostY > currentPiece.y) {
        setCurrentPiece({ ...currentPiece, y: ghostY });
        setStats((prev) => ({ ...prev, score: prev.score + (ghostY - currentPiece.y) }));
        isLockingRef.current = true;
        handlePlacementMoveReset(ghostY);
      }
      return;
    }

    if (!checkCollision(currentPiece.x, currentPiece.y + 1, currentPiece.matrix, board)) {
      setCurrentPiece({ ...currentPiece, y: currentPiece.y + 1 });
      setStats((prev) => ({ ...prev, score: prev.score + 1 }));
      lastMoveWasRotateRef.current = false;
      dropCounterRef.current = 0;
      handlePlacementMoveReset(currentPiece.y + 1);
    } else {
      isLockingRef.current = true;
    }
  }, [checkCollision, calculateGhostY, settings.softDropInstant, handlePlacementMoveReset]);

  // Super Rotation System (SRS) - Clockwise (CW)
  const rotateCW = useCallback(() => {
    const { currentPiece, board, gameStatus } = stateRef.current;
    if (gameStatus !== 'PLAYING' || !currentPiece || isProcessingRef.current) return;

    if (currentPiece.type === 'O') return;

    const currentRotation = currentPiece.rotation;
    const nextRotation = ((currentRotation + 1) % 4) as RotationState;
    const nextMatrix = TETROMINO_SHAPES[currentPiece.type][nextRotation];
    const kickKey = `${currentRotation}->${nextRotation}`;
    const kickTable =
      currentPiece.type === 'I' ? SRS_KICK_TABLE_I[kickKey] : SRS_KICK_TABLE_JLSTZ[kickKey];

    if (!kickTable) return;

    for (let i = 0; i < kickTable.length; i++) {
      const [kx, ky] = kickTable[i];
      const targetX = currentPiece.x + kx;
      const targetY = currentPiece.y - ky; // Subtract ky because +ky is UP in Cartesian

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
        lastKickIndexRef.current = i;

        if (isLockingRef.current) {
          handlePlacementMoveReset(targetY);
        }
        return;
      }
    }
  }, [checkCollision, handlePlacementMoveReset]);

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

    for (let i = 0; i < kickTable.length; i++) {
      const [kx, ky] = kickTable[i];
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
        lastKickIndexRef.current = i;

        if (isLockingRef.current) {
          handlePlacementMoveReset(targetY);
        }
        return;
      }
    }
  }, [checkCollision, handlePlacementMoveReset]);

  // 180-Degree Rotation with Wall Kicks
  const rotate180 = useCallback(() => {
    const { currentPiece, board, gameStatus } = stateRef.current;
    if (gameStatus !== 'PLAYING' || !currentPiece || isProcessingRef.current) return;
    if (currentPiece.type === 'O') return;

    const currentRotation = currentPiece.rotation;
    const nextRotation = ((currentRotation + 2) % 4) as RotationState;
    const nextMatrix = TETROMINO_SHAPES[currentPiece.type][nextRotation];
    const kickKey = `${currentRotation}->${nextRotation}`;
    const kickTable = SRS_KICK_TABLE_180[kickKey] || [[0, 0]];

    for (let i = 0; i < kickTable.length; i++) {
      const [kx, ky] = kickTable[i];
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
        lastMoveWasRotateRef.current = true;
        lastKickIndexRef.current = i;

        if (isLockingRef.current) {
          handlePlacementMoveReset(targetY);
        }
        return;
      }
    }
  }, [checkCollision, handlePlacementMoveReset]);

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
      setHeldPiece(pieceTypeToHold);
      spawnPiece();
    } else {
      setHeldPiece(pieceTypeToHold);
      spawnPiece(heldPiece);
    }
  }, [spawnPiece]);

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

  // Mode Selection & Launch
  const startModeGame = useCallback((mode: GameMode) => {
    setGameMode(mode);
    try {
      localStorage.setItem('naga_tetris_mode', mode);
    } catch {}
    resetGame(mode);
  }, []);

  // Reset / Restart Game Round
  const resetGame = useCallback(
    (targetMode?: GameMode) => {
      const activeMode = targetMode || stateRef.current.gameMode;
      const empty = createEmptyBoard();
      bagRef.current.reset();
      setBoard(empty);
      setCurrentPiece(null);
      setHeldPiece(null);
      setCanHold(true);
      setNextQueue(bagRef.current.peek(5));
      setGameStatus('PLAYING');
      setClearingLines([]);
      setLockCells([]);
      setLastClear(null);
      setIsNewHighScore(false);
      setIsNewBestSprint(false);
      setSprintElapsedMs(0);
      setBlitzRemainingMs(120000);
      isProcessingRef.current = false;
      dropCounterRef.current = 0;
      lockTimerRef.current = 0;
      lockMovesRef.current = 0;
      lowestYRef.current = 0;
      isLockingRef.current = false;

      setStats({
        score: 0,
        highScore: stateRef.current.careerStats.marathonHighScore,
        lines: 0,
        level: activeMode === 'ZEN' ? 5 : 0,
        combo: -1,
        maxCombo: 0,
        backToBack: false,
        b2bCount: 0,
        singles: 0,
        doubles: 0,
        triples: 0,
        tetrises: 0,
        tSpins: 0,
        perfectClears: 0,
        piecesPlaced: 0,
        startTime: Date.now(),
        elapsedSeconds: 0,
        mode: activeMode,
        bestSprintMs: stateRef.current.careerStats.bestSprintMs,
        bestBlitzScore: stateRef.current.careerStats.bestBlitzScore,
        pps: 0,
      });

      spawnPiece(undefined, empty);
    },
    [spawnPiece]
  );

  // Return to Main Menu
  const returnToMainMenu = useCallback(() => {
    setGameStatus('MENU');
    setCurrentPiece(null);
  }, []);

  // Settings Update
  const handleUpdateSettings = useCallback((newSettings: HandlingSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('naga_tetris_settings', JSON.stringify(newSettings));
    } catch {}
  }, []);

  // Reset Career Stats
  const handleResetCareerStats = useCallback(() => {
    setCareerStats(DEFAULT_CAREER_STATS);
    try {
      localStorage.removeItem('naga_career_stats');
      localStorage.removeItem('sb_tetris_highscore');
      localStorage.removeItem('naga_sprint_pb');
      localStorage.removeItem('naga_blitz_hi');
    } catch {}
  }, []);

  // Gesture Controls on Game Board
  const handleBoardTouchStart = (e: React.TouchEvent) => {
    if (!settings.swipeEnabled || stateRef.current.gameStatus !== 'PLAYING') return;
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  };

  const handleBoardTouchEnd = (e: React.TouchEvent) => {
    if (!settings.swipeEnabled || !touchStartPos.current || stateRef.current.gameStatus !== 'PLAYING') return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartPos.current.x;
    const dy = touch.clientY - touchStartPos.current.y;
    const dt = Date.now() - touchStartPos.current.time;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (dt < 250 && absX < 15 && absY < 15) {
      // Tap -> Rotate CW
      rotateCW();
    } else if (absY > 60 && dy > 0 && absY > absX * 1.5 && dt < 200) {
      // Fast Flick Down -> Hard Drop
      hardDrop();
    } else if (absY > 50 && dy < 0 && absY > absX * 1.5) {
      // Swipe Up -> Hold
      holdCurrentPiece();
    }
    touchStartPos.current = null;
  };

  // Keyboard Event Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Tab'].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (stateRef.current.gameStatus === 'PLAYING' || stateRef.current.gameStatus === 'PAUSED') {
          togglePause();
        }
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        handleToggleMute();
        return;
      }

      if (stateRef.current.gameStatus !== 'PLAYING' || isProcessingRef.current) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'j':
        case 'J':
          moveLeft();
          break;
        case 'ArrowRight':
        case 'l':
        case 'L':
          moveRight();
          break;
        case 'ArrowDown':
        case 'k':
        case 'K':
          softDrop();
          break;
        case 'ArrowUp':
        case 'x':
        case 'X':
          rotateCW();
          break;
        case 'z':
        case 'Z':
          rotateCCW();
          break;
        case 'a':
        case 'A':
          rotate180();
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
  }, [moveLeft, moveRight, softDrop, rotateCW, rotateCCW, rotate180, hardDrop, holdCurrentPiece, togglePause, handleToggleMute]);

  // Main 60 FPS Game Loop
  const gameLoop = useCallback(
    (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;

      const { gameStatus, currentPiece, board, stats, gameMode } = stateRef.current;

      if (gameStatus === 'PLAYING' && !isProcessingRef.current) {
        const now = Date.now();
        const elapsedSecs = Math.floor((now - stats.startTime) / 1000);

        // Sprint Stopwatch
        if (gameMode === 'SPRINT') {
          setSprintElapsedMs(now - stats.startTime);
        }

        // Blitz Countdown
        if (gameMode === 'BLITZ') {
          const remaining = 120000 - (now - stats.startTime);
          setBlitzRemainingMs(remaining);

          if (remaining <= 0) {
            setGameStatus('VICTORY');
            synthAudio.playVictory();
            recordCareerProgress(stats);
          }
        }

        // Track stats
        setStats((prev) => ({
          ...prev,
          elapsedSeconds: elapsedSecs,
          pps: elapsedSecs > 0 ? Number((prev.piecesPlaced / elapsedSecs).toFixed(2)) : 0,
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

            const currentInterval =
              gameMode === 'ZEN' ? 400 : getDropInterval(stats.level);

            if (dropCounterRef.current >= currentInterval) {
              dropCounterRef.current = 0;
              if (!checkCollision(currentPiece.x, currentPiece.y + 1, currentPiece.matrix, board)) {
                setCurrentPiece({ ...currentPiece, y: currentPiece.y + 1 });
                lastMoveWasRotateRef.current = false;
                if (currentPiece.y + 1 > lowestYRef.current) {
                  lowestYRef.current = currentPiece.y + 1;
                }
              }
            }
          }
        }
      }

      requestRef.current = requestAnimationFrame(gameLoop);
    },
    [checkCollision, lockPiece, spawnPiece, recordCareerProgress]
  );

  // Mount & Loop
  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  const ghostY =
    currentPiece && !isProcessingRef.current ? calculateGhostY(currentPiece, board) : -1;

  return (
    <div
      className={`w-full h-dvh bg-black text-white flex flex-col items-center justify-between font-mono relative overflow-hidden select-none touch-none ${
        shake ? 'anim-shake' : ''
      } ${hudFlash ? 'hud-flash' : ''} max-w-md mx-auto`}
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 4px)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
        paddingLeft: 'max(env(safe-area-inset-left, 0px), 4px)',
        paddingRight: 'max(env(safe-area-inset-right, 0px), 4px)',
      }}
    >
      <div className="scanline"></div>

      {/* RENDER VIEW: MAIN MENU vs GAME PLAYFIELD */}
      {gameStatus === 'MENU' ? (
        <MainMenu
          onStartGame={startModeGame}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenStats={() => setIsStatsOpen(true)}
          careerStats={careerStats}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      ) : (
        <>
          {/* TOP COCKPIT HUD & TELEMETRY */}
          <div className="w-full flex-shrink-0 px-2 pt-1 pb-0.5 z-20">
            <ScoreBoard
              stats={stats}
              isMuted={isMuted}
              onToggleMute={handleToggleMute}
              onPause={togglePause}
              isPaused={gameStatus === 'PAUSED'}
              onOpenSettings={() => setIsSettingsOpen(true)}
              sprintElapsedTimeMs={sprintElapsedMs}
              blitzRemainingMs={blitzRemainingMs}
              heldPiece={heldPiece}
              canHold={canHold}
              onHoldClick={holdCurrentPiece}
              nextQueue={nextQueue}
            />
          </div>

          {/* GIANT DOMINANT 10x20 PLAYFIELD */}
          <div
            className="flex-1 w-full min-h-0 flex items-center justify-center px-1 z-10 py-1 overflow-hidden"
            onTouchStart={handleBoardTouchStart}
            onTouchEnd={handleBoardTouchEnd}
          >
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

          {/* TACTILE TOUCH CONTROLS */}
          <TouchControls
            onMoveLeft={moveLeft}
            onMoveRight={moveRight}
            onSoftDrop={softDrop}
            onHardDrop={hardDrop}
            onRotateCW={rotateCW}
            onRotateCCW={rotateCCW}
            onRotate180={rotate180}
            onHold={holdCurrentPiece}
            disabled={gameStatus !== 'PLAYING'}
            settings={settings}
          />
        </>
      )}

      {/* MODALS */}
      {gameStatus === 'PAUSED' && (
        <PauseModal
          onResume={togglePause}
          onRestart={() => resetGame()}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onReturnToMenu={returnToMainMenu}
        />
      )}

      {(gameStatus === 'GAMEOVER' || gameStatus === 'VICTORY') && (
        <GameOverModal
          stats={stats}
          status={gameStatus}
          isNewHighScore={isNewHighScore}
          isNewBestSprint={isNewBestSprint}
          onRestart={() => resetGame()}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onReturnToMenu={returnToMainMenu}
        />
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentMode={gameMode}
        onSelectMode={(mode) => {
          setGameMode(mode);
          if (gameStatus === 'PLAYING') {
            resetGame(mode);
          }
        }}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        bestSprintMs={careerStats.bestSprintMs}
        bestBlitzScore={careerStats.bestBlitzScore}
      />

      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        careerStats={careerStats}
        onResetStats={handleResetCareerStats}
      />
    </div>
  );
}

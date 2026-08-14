import { TetrominoType, RotationState } from '../types/tetris';

export const BOARD_ROWS = 20;
export const BOARD_COLS = 10;
export const LOCK_DELAY_MS = 500;
export const MAX_LOCK_MOVES = 15;

// Canonical 4-state rotation matrices (Super Rotation System - SRS)
export const TETROMINO_SHAPES: Record<TetrominoType, number[][][]> = {
  I: [
    // 0: Spawn
    [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    // 1: R (90 deg CW)
    [
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
    ],
    // 2: 2 (180 deg)
    [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
    ],
    // 3: L (270 deg / 90 CCW)
    [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
    ],
  ],
  J: [
    // 0: Spawn
    [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    // 1: R
    [
      [0, 1, 1],
      [0, 1, 0],
      [0, 1, 0],
    ],
    // 2: 2
    [
      [0, 0, 0],
      [1, 1, 1],
      [0, 0, 1],
    ],
    // 3: L
    [
      [0, 1, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
  ],
  L: [
    // 0: Spawn
    [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    // 1: R
    [
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 1],
    ],
    // 2: 2
    [
      [0, 0, 0],
      [1, 1, 1],
      [1, 0, 0],
    ],
    // 3: L
    [
      [1, 1, 0],
      [0, 1, 0],
      [0, 1, 0],
    ],
  ],
  O: [
    // 0, 1, 2, 3 (O has identical shape across rotations)
    [
      [1, 1],
      [1, 1],
    ],
    [
      [1, 1],
      [1, 1],
    ],
    [
      [1, 1],
      [1, 1],
    ],
    [
      [1, 1],
      [1, 1],
    ],
  ],
  S: [
    // 0: Spawn
    [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    // 1: R
    [
      [0, 1, 0],
      [0, 1, 1],
      [0, 0, 1],
    ],
    // 2: 2
    [
      [0, 0, 0],
      [0, 1, 1],
      [1, 1, 0],
    ],
    // 3: L
    [
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
    ],
  ],
  T: [
    // 0: Spawn
    [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    // 1: R
    [
      [0, 1, 0],
      [0, 1, 1],
      [0, 1, 0],
    ],
    // 2: 2
    [
      [0, 0, 0],
      [1, 1, 1],
      [0, 1, 0],
    ],
    // 3: L
    [
      [0, 1, 0],
      [1, 1, 0],
      [0, 1, 0],
    ],
  ],
  Z: [
    // 0: Spawn
    [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    // 1: R
    [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
    // 2: 2
    [
      [0, 0, 0],
      [1, 1, 0],
      [0, 1, 1],
    ],
    // 3: L
    [
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
    ],
  ],
};

// SRS Wall Kick Offsets: [dx, dy] where dy is negative for UP in grid space (y decreases going up)
// Standard Wall Kick Table for J, L, S, T, Z pieces:
export const SRS_KICK_TABLE_JLSTZ: Record<string, [number, number][]> = {
  '0->1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '1->0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '1->2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '2->1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '2->3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '3->2': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '3->0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '0->3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
};

// SRS Wall Kick Table for I piece:
export const SRS_KICK_TABLE_I: Record<string, [number, number][]> = {
  '0->1': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '1->0': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '1->2': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  '2->1': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '2->3': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '3->2': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '3->0': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '0->3': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
};

// Gravity speed curve by level (fall interval in milliseconds)
export const LEVEL_SPEEDS: number[] = [
  1000, // Level 0
  800,  // Level 1
  650,  // Level 2
  500,  // Level 3
  380,  // Level 4
  290,  // Level 5
  210,  // Level 6
  150,  // Level 7
  100,  // Level 8
  70,   // Level 9
  50,   // Level 10
  40,   // Level 11
  30,   // Level 12
  25,   // Level 13
  20,   // Level 14+
];

export const getDropInterval = (level: number): number => {
  if (level >= LEVEL_SPEEDS.length) {
    return LEVEL_SPEEDS[LEVEL_SPEEDS.length - 1];
  }
  return LEVEL_SPEEDS[Math.max(0, level)];
};

// Canonical Line Clear Scoring
export const SCORE_SINGLE = 100;
export const SCORE_DOUBLE = 300;
export const SCORE_TRIPLE = 500;
export const SCORE_TETRIS = 800;

export const SCORE_TSPIN_MINI = 100;
export const SCORE_TSPIN_SINGLE = 800;
export const SCORE_TSPIN_DOUBLE = 1200;
export const SCORE_TSPIN_TRIPLE = 1600;

export const BACK_TO_BACK_MULTIPLIER = 1.5;

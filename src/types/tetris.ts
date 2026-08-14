export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

export type RotationState = 0 | 1 | 2 | 3; // 0 = 0deg (spawn), 1 = 90deg (R), 2 = 180deg (2), 3 = 270deg (L)

export interface TetrominoDefinition {
  type: TetrominoType;
  shapes: number[][][]; // 4 rotation states: [0, 1, 2, 3]
  colorClass: string;
}

export interface ActivePiece {
  type: TetrominoType;
  rotation: RotationState;
  x: number;
  y: number;
  matrix: number[][];
}

export type CellValue = TetrominoType | 'ghost' | null;

export type BoardMatrix = CellValue[][];

export interface GameStats {
  score: number;
  highScore: number;
  lines: number;
  level: number;
  combo: number;
  maxCombo: number;
  backToBack: boolean;
  b2bCount: number;
  singles: number;
  doubles: number;
  triples: number;
  tetrises: number;
  tSpins: number;
  piecesPlaced: number;
  startTime: number;
  elapsedSeconds: number;
}

export type GameStatus = 'IDLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export type ClearType = 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'TETRIS' | 'TSPIN_MINI' | 'TSPIN_SINGLE' | 'TSPIN_DOUBLE' | 'TSPIN_TRIPLE' | 'PERFECT_CLEAR' | null;

export interface LastClearEvent {
  type: ClearType;
  lines: number;
  points: number;
  combo: number;
  b2b: boolean;
  timestamp: number;
}

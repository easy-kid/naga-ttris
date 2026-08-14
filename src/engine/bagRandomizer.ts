import { TetrominoType } from '../types/tetris';

const ALL_PIECES: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

export class BagRandomizer {
  private queue: TetrominoType[] = [];

  constructor() {
    this.refill();
    this.refill();
  }

  private shuffle(array: TetrominoType[]): TetrominoType[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private refill(): void {
    const newBag = this.shuffle(ALL_PIECES);
    this.queue.push(...newBag);
  }

  public next(): TetrominoType {
    if (this.queue.length <= 7) {
      this.refill();
    }
    const piece = this.queue.shift();
    if (!piece) {
      this.refill();
      return this.queue.shift() || 'T';
    }
    return piece;
  }

  public peek(count: number = 3): TetrominoType[] {
    while (this.queue.length < count + 7) {
      this.refill();
    }
    return this.queue.slice(0, count);
  }

  public reset(): void {
    this.queue = [];
    this.refill();
    this.refill();
  }
}

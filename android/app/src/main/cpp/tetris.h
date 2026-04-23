#ifndef TETRIS_H
#define TETRIS_H

#include <stdbool.h>
#include <stdint.h>

/* ── Board dimensions ── */
#define ROWS 20
#define COLS 10
#define NUM_PIECES 7

/* ── Cell types (0 = empty, 1-7 = pieces, 8 = ghost) ── */
typedef enum {
    CELL_EMPTY = 0,
    CELL_I, CELL_J, CELL_L, CELL_O, CELL_S, CELL_T, CELL_Z,
    CELL_GHOST
} CellType;

/* ── Static tetromino template ── */
typedef struct {
    int shape[4][4];
    int size;          /* bounding box side length (2-4) */
    CellType type;
} Tetromino;

/* ── Active piece currently falling ── */
typedef struct {
    int matrix[4][4];
    int size;
    CellType type;
    int x, y;          /* board coordinates of top-left of bounding box */
} ActivePiece;

typedef enum {
    GAME_PLAYING,
    GAME_CLEARING,     /* line-clear animation in progress */
    GAME_OVER
} GameState;

/* ── Complete game state ── */
typedef struct {
    CellType board[ROWS][COLS];

    ActivePiece current;
    bool        has_current;

    Tetromino next_piece;

    int   score;
    int   level;
    int   drop_interval_ms;

    GameState state;

    /* line-clear animation */
    int   clearing_rows[4];
    int   clearing_count;
    float clear_anim_ms;    /* counts up to CLEAR_ANIM_DURATION */

    /* lock-pulse animation */
    int   lock_x[16];
    int   lock_y[16];
    int   lock_count;
    float lock_anim_ms;

    /* visual effects */
    bool  shake;
    float shake_ms;
    float shake_ox, shake_oy; /* current shake pixel offset */

    bool  drop_flash;
    float drop_flash_ms;

    bool  hud_flash;
    float hud_flash_ms;

    /* drop accumulator */
    float drop_acc_ms;
} TetrisGame;

/* ── Public API ── */
void tetris_init   (TetrisGame *g);
void tetris_reset  (TetrisGame *g);
void tetris_update (TetrisGame *g, float delta_ms);

/* Player actions — safe to call any time */
void tetris_move_left  (TetrisGame *g);
void tetris_move_right (TetrisGame *g);
void tetris_rotate     (TetrisGame *g);
void tetris_soft_drop  (TetrisGame *g);
void tetris_hard_drop  (TetrisGame *g);
void tetris_restart    (TetrisGame *g);

/* Build display board (board + ghost + active piece overlaid) */
void tetris_get_display_board(const TetrisGame *g, CellType out[ROWS][COLS]);

/* Is a given row currently clearing (for animation)? */
bool tetris_row_is_clearing(const TetrisGame *g, int row);

#define CLEAR_ANIM_DURATION_MS 250.0f
#define LOCK_ANIM_DURATION_MS  300.0f
#define SHAKE_DURATION_MS      150.0f
#define FLASH_DURATION_MS      150.0f
#define HUD_FLASH_DURATION_MS  100.0f

#endif /* TETRIS_H */

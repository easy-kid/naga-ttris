#ifndef TETRIS_CORE_H
#define TETRIS_CORE_H

#include <stdbool.h>
#include <stdint.h>

#define BOARD_ROWS 20
#define BOARD_COLS 10
#define LOCK_DELAY_MS 500
#define MAX_LOCK_MOVES 15
#define PREVIEW_QUEUE_SIZE 3

typedef enum {
    PIECE_NONE = 0,
    PIECE_I,
    PIECE_J,
    PIECE_L,
    PIECE_O,
    PIECE_S,
    PIECE_T,
    PIECE_Z
} PieceType;

typedef enum {
    ROT_0 = 0, // Spawn
    ROT_R = 1, // 90 deg Clockwise
    ROT_2 = 2, // 180 deg
    ROT_L = 3  // 270 deg / 90 Counter-Clockwise
} RotationState;

typedef enum {
    GAME_STATE_PLAYING = 0,
    GAME_STATE_PAUSED,
    GAME_STATE_GAMEOVER
} GameState;

typedef enum {
    CLEAR_NONE = 0,
    CLEAR_SINGLE,
    CLEAR_DOUBLE,
    CLEAR_TRIPLE,
    CLEAR_TETRIS,
    CLEAR_TSPIN_MINI,
    CLEAR_TSPIN_SINGLE,
    CLEAR_TSPIN_DOUBLE,
    CLEAR_TSPIN_TRIPLE
} ClearType;

typedef struct {
    PieceType type;
    RotationState rotation;
    int x;
    int y;
} ActivePiece;

typedef struct {
    uint8_t board[BOARD_ROWS][BOARD_COLS]; // Store PieceType (0 if empty)
    ActivePiece current_piece;
    PieceType hold_piece;
    bool can_hold;
    
    // 7-Bag Randomizer state
    PieceType bag[14];
    int bag_index;
    PieceType next_queue[PREVIEW_QUEUE_SIZE];
    
    // Scoring & Stats
    uint32_t score;
    uint32_t high_score;
    uint32_t lines;
    uint32_t level;
    int combo;
    int max_combo;
    bool back_to_back;
    uint32_t b2b_count;
    uint32_t singles;
    uint32_t doubles;
    uint32_t triples;
    uint32_t tetrises;
    uint32_t tspins;
    uint32_t pieces_placed;

    // Timing & Physics
    int drop_counter_ms;
    int drop_interval_ms;
    int lock_timer_ms;
    int lock_moves_count;
    bool is_locking;
    bool last_move_rotate;
    
    GameState state;
    ClearType last_clear_type;
    int last_clear_lines;
    uint32_t last_clear_points;
    bool last_clear_b2b;
} TetrisEngine;

// Function Prototypes
void tetris_init(TetrisEngine *engine, unsigned int seed);
void tetris_reset(TetrisEngine *engine);
bool tetris_check_collision(const TetrisEngine *engine, int px, int py, RotationState rot, PieceType type);
int  tetris_calculate_ghost_y(const TetrisEngine *engine);
bool tetris_spawn_piece(TetrisEngine *engine, PieceType specific_piece);
bool tetris_move_left(TetrisEngine *engine);
bool tetris_move_right(TetrisEngine *engine);
bool tetris_soft_drop(TetrisEngine *engine);
bool tetris_rotate_cw(TetrisEngine *engine);
bool tetris_rotate_ccw(TetrisEngine *engine);
int  tetris_hard_drop(TetrisEngine *engine);
bool tetris_hold(TetrisEngine *engine);
void tetris_tick(TetrisEngine *engine, int delta_ms);
int  tetris_lock_piece(TetrisEngine *engine);
int  tetris_clear_lines(TetrisEngine *engine);
bool tetris_detect_tspin(const TetrisEngine *engine);
int  tetris_get_drop_interval_for_level(uint32_t level);

// Shape matrix access
const int* tetris_get_shape_matrix(PieceType type, RotationState rot, int *dim);

#endif // TETRIS_CORE_H

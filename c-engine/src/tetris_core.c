#include "tetris_core.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

// Shape definitions: 4 rotations per piece
// I piece: 4x4
static const int SHAPE_I[4][4][4] = {
    { // 0
        {0, 0, 0, 0},
        {1, 1, 1, 1},
        {0, 0, 0, 0},
        {0, 0, 0, 0}
    },
    { // R
        {0, 0, 1, 0},
        {0, 0, 1, 0},
        {0, 0, 1, 0},
        {0, 0, 1, 0}
    },
    { // 2
        {0, 0, 0, 0},
        {0, 0, 0, 0},
        {1, 1, 1, 1},
        {0, 0, 0, 0}
    },
    { // L
        {0, 1, 0, 0},
        {0, 1, 0, 0},
        {0, 1, 0, 0},
        {0, 1, 0, 0}
    }
};

// J piece: 3x3
static const int SHAPE_J[4][3][3] = {
    { {1,0,0}, {1,1,1}, {0,0,0} },
    { {0,1,1}, {0,1,0}, {0,1,0} },
    { {0,0,0}, {1,1,1}, {0,0,1} },
    { {0,1,0}, {0,1,0}, {1,1,0} }
};

// L piece: 3x3
static const int SHAPE_L[4][3][3] = {
    { {0,0,1}, {1,1,1}, {0,0,0} },
    { {0,1,0}, {0,1,0}, {0,1,1} },
    { {0,0,0}, {1,1,1}, {1,0,0} },
    { {1,1,0}, {0,1,0}, {0,1,0} }
};

// O piece: 2x2
static const int SHAPE_O[4][2][2] = {
    { {1,1}, {1,1} },
    { {1,1}, {1,1} },
    { {1,1}, {1,1} },
    { {1,1}, {1,1} }
};

// S piece: 3x3
static const int SHAPE_S[4][3][3] = {
    { {0,1,1}, {1,1,0}, {0,0,0} },
    { {0,1,0}, {0,1,1}, {0,0,1} },
    { {0,0,0}, {0,1,1}, {1,1,0} },
    { {1,0,0}, {1,1,0}, {0,1,0} }
};

// T piece: 3x3
static const int SHAPE_T[4][3][3] = {
    { {0,1,0}, {1,1,1}, {0,0,0} },
    { {0,1,0}, {0,1,1}, {0,1,0} },
    { {0,0,0}, {1,1,1}, {0,1,0} },
    { {0,1,0}, {1,1,0}, {0,1,0} }
};

// Z piece: 3x3
static const int SHAPE_Z[4][3][3] = {
    { {1,1,0}, {0,1,1}, {0,0,0} },
    { {0,0,1}, {0,1,1}, {0,1,0} },
    { {0,0,0}, {1,1,0}, {0,1,1} },
    { {0,1,0}, {1,1,0}, {1,0,0} }
};

// SRS Wall Kick Offsets: 5 test points per transition (x, y where +y is UP in SRS table, so in grid we subtract y)
typedef struct { int x; int y; } KickOffset;

static const KickOffset KICKS_JLSTZ[8][5] = {
    /* 0->R (0->1) */ { {0,0}, {-1,0}, {-1,1}, {0,-2}, {-1,-2} },
    /* R->0 (1->0) */ { {0,0}, {1,0},  {1,-1}, {0,2},  {1,2}   },
    /* R->2 (1->2) */ { {0,0}, {1,0},  {1,-1}, {0,2},  {1,2}   },
    /* 2->R (2->1) */ { {0,0}, {-1,0}, {-1,1}, {0,-2}, {-1,-2} },
    /* 2->L (2->3) */ { {0,0}, {1,0},  {1,1},  {0,-2}, {1,-2}  },
    /* L->2 (3->2) */ { {0,0}, {-1,0}, {-1,-1},{0,2},  {-1,2}  },
    /* L->0 (3->0) */ { {0,0}, {-1,0}, {-1,-1},{0,2},  {-1,2}  },
    /* 0->L (0->3) */ { {0,0}, {1,0},  {1,1},  {0,-2}, {1,-2}  }
};

static const KickOffset KICKS_I[8][5] = {
    /* 0->R (0->1) */ { {0,0}, {-2,0}, {1,0},  {-2,-1}, {1,2}  },
    /* R->0 (1->0) */ { {0,0}, {2,0},  {-1,0}, {2,1},   {-1,-2}},
    /* R->2 (1->2) */ { {0,0}, {-1,0}, {2,0},  {-1,2},  {2,-1} },
    /* 2->R (2->1) */ { {0,0}, {1,0},  {-2,0}, {1,-2},  {-2,1} },
    /* 2->L (2->3) */ { {0,0}, {2,0},  {-1,0}, {2,1},   {-1,-2}},
    /* L->2 (3->2) */ { {0,0}, {-2,0}, {1,0},  {-2,-1}, {1,2}  },
    /* L->0 (3->0) */ { {0,0}, {1,0},  {-2,0}, {1,-2},  {-2,1} },
    /* 0->L (0->3) */ { {0,0}, {-1,0}, {2,0},  {-1,2},  {2,-1} }
};

static int get_kick_index(RotationState from, RotationState to) {
    if (from == ROT_0 && to == ROT_R) return 0;
    if (from == ROT_R && to == ROT_0) return 1;
    if (from == ROT_R && to == ROT_2) return 2;
    if (from == ROT_2 && to == ROT_R) return 3;
    if (from == ROT_2 && to == ROT_L) return 4;
    if (from == ROT_L && to == ROT_2) return 5;
    if (from == ROT_L && to == ROT_0) return 6;
    if (from == ROT_0 && to == ROT_L) return 7;
    return 0;
}

const int* tetris_get_shape_matrix(PieceType type, RotationState rot, int *dim) {
    rot = (RotationState)(rot % 4);
    switch (type) {
        case PIECE_I: *dim = 4; return &SHAPE_I[rot][0][0];
        case PIECE_J: *dim = 3; return &SHAPE_J[rot][0][0];
        case PIECE_L: *dim = 3; return &SHAPE_L[rot][0][0];
        case PIECE_O: *dim = 2; return &SHAPE_O[rot][0][0];
        case PIECE_S: *dim = 3; return &SHAPE_S[rot][0][0];
        case PIECE_T: *dim = 3; return &SHAPE_T[rot][0][0];
        case PIECE_Z: *dim = 3; return &SHAPE_Z[rot][0][0];
        default:      *dim = 0; return NULL;
    }
}

// Speed table by level (ms per drop)
static const int LEVEL_SPEEDS[] = {
    1000, 800, 650, 500, 380, 290, 210, 150, 100, 70, 50, 40, 30, 25, 20
};
#define SPEED_COUNT (sizeof(LEVEL_SPEEDS)/sizeof(LEVEL_SPEEDS[0]))

int tetris_get_drop_interval_for_level(uint32_t level) {
    if (level >= SPEED_COUNT) {
        return LEVEL_SPEEDS[SPEED_COUNT - 1];
    }
    return LEVEL_SPEEDS[level];
}

// 7-Bag Randomizer
static void shuffle_bag(PieceType *bag) {
    PieceType pieces[7] = {
        PIECE_I, PIECE_J, PIECE_L, PIECE_O, PIECE_S, PIECE_T, PIECE_Z
    };
    for (int i = 6; i > 0; i--) {
        int j = rand() % (i + 1);
        PieceType tmp = pieces[i];
        pieces[i] = pieces[j];
        pieces[j] = tmp;
    }
    memcpy(bag, pieces, sizeof(pieces));
}

static void refill_bags(TetrisEngine *engine) {
    if (engine->bag_index >= 7) {
        memcpy(&engine->bag[0], &engine->bag[7], 7 * sizeof(PieceType));
        shuffle_bag(&engine->bag[7]);
        engine->bag_index -= 7;
    }
}

static PieceType pop_bag(TetrisEngine *engine) {
    refill_bags(engine);
    PieceType p = engine->bag[engine->bag_index++];
    refill_bags(engine);
    
    // Update preview queue
    for (int i = 0; i < PREVIEW_QUEUE_SIZE; i++) {
        engine->next_queue[i] = engine->bag[engine->bag_index + i];
    }
    return p;
}

void tetris_init(TetrisEngine *engine, unsigned int seed) {
    srand(seed);
    memset(engine, 0, sizeof(TetrisEngine));
    
    // Fill both bags
    shuffle_bag(&engine->bag[0]);
    shuffle_bag(&engine->bag[7]);
    engine->bag_index = 0;
    
    for (int i = 0; i < PREVIEW_QUEUE_SIZE; i++) {
        engine->next_queue[i] = engine->bag[i];
    }
    
    engine->drop_interval_ms = tetris_get_drop_interval_for_level(0);
    engine->can_hold = true;
    engine->combo = -1;
    engine->state = GAME_STATE_PLAYING;
    
    tetris_spawn_piece(engine, PIECE_NONE);
}

void tetris_reset(TetrisEngine *engine) {
    uint32_t hi = engine->high_score;
    tetris_init(engine, (unsigned int)rand());
    engine->high_score = hi;
}

bool tetris_check_collision(const TetrisEngine *engine, int px, int py, RotationState rot, PieceType type) {
    if (type == PIECE_NONE) return false;
    int dim = 0;
    const int *matrix = tetris_get_shape_matrix(type, rot, &dim);
    if (!matrix) return true;

    for (int y = 0; y < dim; y++) {
        for (int x = 0; x < dim; x++) {
            if (matrix[y * dim + x] != 0) {
                int tx = px + x;
                int ty = py + y;

                if (tx < 0 || tx >= BOARD_COLS || ty >= BOARD_ROWS) {
                    return true;
                }
                if (ty >= 0 && engine->board[ty][tx] != 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

int tetris_calculate_ghost_y(const TetrisEngine *engine) {
    if (engine->current_piece.type == PIECE_NONE) return 0;
    int gy = engine->current_piece.y;
    while (!tetris_check_collision(engine, engine->current_piece.x, gy + 1,
                                   engine->current_piece.rotation, engine->current_piece.type)) {
        gy++;
    }
    return gy;
}

bool tetris_spawn_piece(TetrisEngine *engine, PieceType specific_piece) {
    PieceType type = (specific_piece != PIECE_NONE) ? specific_piece : pop_bag(engine);
    int dim = 0;
    tetris_get_shape_matrix(type, ROT_0, &dim);
    
    int start_x = (BOARD_COLS - dim) / 2;
    int start_y = (type == PIECE_I) ? -1 : 0;

    if (tetris_check_collision(engine, start_x, start_y, ROT_0, type)) {
        engine->state = GAME_STATE_GAMEOVER;
        return false;
    }

    engine->current_piece.type = type;
    engine->current_piece.rotation = ROT_0;
    engine->current_piece.x = start_x;
    engine->current_piece.y = start_y;
    
    engine->can_hold = true;
    engine->is_locking = false;
    engine->lock_timer_ms = 0;
    engine->lock_moves_count = 0;
    engine->last_move_rotate = false;
    return true;
}

bool tetris_move_left(TetrisEngine *engine) {
    if (engine->state != GAME_STATE_PLAYING || engine->current_piece.type == PIECE_NONE) return false;
    
    ActivePiece *p = &engine->current_piece;
    if (!tetris_check_collision(engine, p->x - 1, p->y, p->rotation, p->type)) {
        p->x--;
        engine->last_move_rotate = false;
        if (engine->is_locking && engine->lock_moves_count < MAX_LOCK_MOVES) {
            engine->lock_timer_ms = 0;
            engine->lock_moves_count++;
        }
        return true;
    }
    return false;
}

bool tetris_move_right(TetrisEngine *engine) {
    if (engine->state != GAME_STATE_PLAYING || engine->current_piece.type == PIECE_NONE) return false;
    
    ActivePiece *p = &engine->current_piece;
    if (!tetris_check_collision(engine, p->x + 1, p->y, p->rotation, p->type)) {
        p->x++;
        engine->last_move_rotate = false;
        if (engine->is_locking && engine->lock_moves_count < MAX_LOCK_MOVES) {
            engine->lock_timer_ms = 0;
            engine->lock_moves_count++;
        }
        return true;
    }
    return false;
}

bool tetris_soft_drop(TetrisEngine *engine) {
    if (engine->state != GAME_STATE_PLAYING || engine->current_piece.type == PIECE_NONE) return false;

    ActivePiece *p = &engine->current_piece;
    if (!tetris_check_collision(engine, p->x, p->y + 1, p->rotation, p->type)) {
        p->y++;
        engine->score += 1;
        engine->drop_counter_ms = 0;
        engine->last_move_rotate = false;
        return true;
    } else {
        engine->is_locking = true;
        return false;
    }
}

bool tetris_rotate_cw(TetrisEngine *engine) {
    if (engine->state != GAME_STATE_PLAYING || engine->current_piece.type == PIECE_NONE) return false;
    if (engine->current_piece.type == PIECE_O) return true;

    ActivePiece *p = &engine->current_piece;
    RotationState from = p->rotation;
    RotationState to = (RotationState)((from + 1) % 4);
    int kick_idx = get_kick_index(from, to);

    for (int i = 0; i < 5; i++) {
        KickOffset offset = (p->type == PIECE_I) ? KICKS_I[kick_idx][i] : KICKS_JLSTZ[kick_idx][i];
        int tx = p->x + offset.x;
        int ty = p->y - offset.y; // Invert y because SRS +y is up

        if (!tetris_check_collision(engine, tx, ty, to, p->type)) {
            p->x = tx;
            p->y = ty;
            p->rotation = to;
            engine->last_move_rotate = true;
            if (engine->is_locking && engine->lock_moves_count < MAX_LOCK_MOVES) {
                engine->lock_timer_ms = 0;
                engine->lock_moves_count++;
            }
            return true;
        }
    }
    return false;
}

bool tetris_rotate_ccw(TetrisEngine *engine) {
    if (engine->state != GAME_STATE_PLAYING || engine->current_piece.type == PIECE_NONE) return false;
    if (engine->current_piece.type == PIECE_O) return true;

    ActivePiece *p = &engine->current_piece;
    RotationState from = p->rotation;
    RotationState to = (RotationState)((from + 3) % 4);
    int kick_idx = get_kick_index(from, to);

    for (int i = 0; i < 5; i++) {
        KickOffset offset = (p->type == PIECE_I) ? KICKS_I[kick_idx][i] : KICKS_JLSTZ[kick_idx][i];
        int tx = p->x + offset.x;
        int ty = p->y - offset.y;

        if (!tetris_check_collision(engine, tx, ty, to, p->type)) {
            p->x = tx;
            p->y = ty;
            p->rotation = to;
            engine->last_move_rotate = true;
            if (engine->is_locking && engine->lock_moves_count < MAX_LOCK_MOVES) {
                engine->lock_timer_ms = 0;
                engine->lock_moves_count++;
            }
            return true;
        }
    }
    return false;
}

int tetris_hard_drop(TetrisEngine *engine) {
    if (engine->state != GAME_STATE_PLAYING || engine->current_piece.type == PIECE_NONE) return 0;
    
    int gy = tetris_calculate_ghost_y(engine);
    int dist = gy - engine->current_piece.y;
    engine->score += (dist * 2);
    engine->current_piece.y = gy;
    
    tetris_lock_piece(engine);
    return dist;
}

bool tetris_hold(TetrisEngine *engine) {
    if (engine->state != GAME_STATE_PLAYING || engine->current_piece.type == PIECE_NONE || !engine->can_hold) {
        return false;
    }

    PieceType current = engine->current_piece.type;

    if (engine->hold_piece == PIECE_NONE) {
        engine->hold_piece = current;
        tetris_spawn_piece(engine, PIECE_NONE);
    } else {
        PieceType prev_hold = engine->hold_piece;
        engine->hold_piece = current;
        tetris_spawn_piece(engine, prev_hold);
    }
    engine->can_hold = false; // Must be false after spawn from hold
    return true;
}

bool tetris_detect_tspin(const TetrisEngine *engine) {
    if (engine->current_piece.type != PIECE_T || !engine->last_move_rotate) return false;

    int px = engine->current_piece.x;
    int py = engine->current_piece.y;

    int corners[4][2] = {
        {px, py}, {px + 2, py}, {px, py + 2}, {px + 2, py + 2}
    };

    int occupied = 0;
    for (int i = 0; i < 4; i++) {
        int cx = corners[i][0];
        int cy = corners[i][1];
        if (cx < 0 || cx >= BOARD_COLS || cy >= BOARD_ROWS) {
            occupied++;
        } else if (cy >= 0 && engine->board[cy][cx] != 0) {
            occupied++;
        }
    }
    return (occupied >= 3);
}

int tetris_lock_piece(TetrisEngine *engine) {
    if (engine->current_piece.type == PIECE_NONE) return 0;

    int dim = 0;
    const int *matrix = tetris_get_shape_matrix(engine->current_piece.type,
                                                engine->current_piece.rotation, &dim);
    ActivePiece *p = &engine->current_piece;

    // Merge piece into board
    for (int y = 0; y < dim; y++) {
        for (int x = 0; x < dim; x++) {
            if (matrix[y * dim + x] != 0) {
                int bx = p->x + x;
                int by = p->y + y;
                if (by >= 0 && by < BOARD_ROWS && bx >= 0 && bx < BOARD_COLS) {
                    engine->board[by][bx] = (uint8_t)p->type;
                }
            }
        }
    }

    bool is_tspin = tetris_detect_tspin(engine);
    int cleared = tetris_clear_lines(engine);

    // Scoring
    uint32_t base_points = 0;
    ClearType ctype = CLEAR_NONE;

    if (is_tspin) {
        engine->tspins++;
        if (cleared == 1) { base_points = 800 * (engine->level + 1); ctype = CLEAR_TSPIN_SINGLE; }
        else if (cleared == 2) { base_points = 1200 * (engine->level + 1); ctype = CLEAR_TSPIN_DOUBLE; }
        else if (cleared == 3) { base_points = 1600 * (engine->level + 1); ctype = CLEAR_TSPIN_TRIPLE; }
        else { base_points = 100 * (engine->level + 1); ctype = CLEAR_TSPIN_MINI; }
    } else {
        if (cleared == 1) { base_points = 100 * (engine->level + 1); ctype = CLEAR_SINGLE; engine->singles++; }
        else if (cleared == 2) { base_points = 300 * (engine->level + 1); ctype = CLEAR_DOUBLE; engine->doubles++; }
        else if (cleared == 3) { base_points = 500 * (engine->level + 1); ctype = CLEAR_TRIPLE; engine->triples++; }
        else if (cleared == 4) { base_points = 800 * (engine->level + 1); ctype = CLEAR_TETRIS; engine->tetrises++; }
    }

    if (cleared > 0) {
        bool hard_clear = (cleared == 4 || is_tspin);
        double multiplier = (hard_clear && engine->back_to_back) ? 1.5 : 1.0;
        
        engine->combo++;
        if (engine->combo > engine->max_combo) {
            engine->max_combo = engine->combo;
        }
        uint32_t combo_bonus = (engine->combo > 0) ? (50 * engine->combo * (engine->level + 1)) : 0;
        uint32_t total = (uint32_t)(base_points * multiplier) + combo_bonus;

        engine->score += total;
        engine->lines += cleared;
        engine->level = engine->lines / 10;
        engine->drop_interval_ms = tetris_get_drop_interval_for_level(engine->level);

        if (engine->score > engine->high_score) {
            engine->high_score = engine->score;
        }

        if (hard_clear) {
            if (engine->back_to_back) engine->b2b_count++;
            engine->back_to_back = true;
        } else {
            engine->back_to_back = false;
        }

        engine->last_clear_type = ctype;
        engine->last_clear_lines = cleared;
        engine->last_clear_points = total;
        engine->last_clear_b2b = (hard_clear && multiplier > 1.0);
    } else {
        engine->combo = -1;
    }

    engine->pieces_placed++;
    engine->current_piece.type = PIECE_NONE;

    if (engine->state != GAME_STATE_GAMEOVER) {
        tetris_spawn_piece(engine, PIECE_NONE);
    }
    return cleared;
}

int tetris_clear_lines(TetrisEngine *engine) {
    int cleared = 0;
    for (int y = BOARD_ROWS - 1; y >= 0; y--) {
        bool full = true;
        for (int x = 0; x < BOARD_COLS; x++) {
            if (engine->board[y][x] == 0) {
                full = false;
                break;
            }
        }
        if (full) {
            cleared++;
            // Shift down
            for (int sy = y; sy > 0; sy--) {
                for (int x = 0; x < BOARD_COLS; x++) {
                    engine->board[sy][x] = engine->board[sy - 1][x];
                }
            }
            for (int x = 0; x < BOARD_COLS; x++) {
                engine->board[0][x] = 0;
            }
            y++; // Check same row again
        }
    }
    return cleared;
}

void tetris_tick(TetrisEngine *engine, int delta_ms) {
    if (engine->state != GAME_STATE_PLAYING || engine->current_piece.type == PIECE_NONE) return;

    ActivePiece *p = &engine->current_piece;
    bool touching = tetris_check_collision(engine, p->x, p->y + 1, p->rotation, p->type);

    if (touching) {
        engine->is_locking = true;
        engine->lock_timer_ms += delta_ms;
        if (engine->lock_timer_ms >= LOCK_DELAY_MS) {
            tetris_lock_piece(engine);
        }
    } else {
        engine->is_locking = false;
        engine->lock_timer_ms = 0;
        engine->drop_counter_ms += delta_ms;

        if (engine->drop_counter_ms >= engine->drop_interval_ms) {
            engine->drop_counter_ms = 0;
            if (!tetris_check_collision(engine, p->x, p->y + 1, p->rotation, p->type)) {
                p->y++;
                engine->last_move_rotate = false;
            }
        }
    }
}

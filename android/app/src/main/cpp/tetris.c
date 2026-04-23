#include "tetris.h"
#include <string.h>
#include <stdlib.h>
#include <math.h>
#include <time.h>

/* ── Tetromino definitions ── */
static const Tetromino PIECES[NUM_PIECES] = {
    /* I */ { {{0,0,0,0},{1,1,1,1},{0,0,0,0},{0,0,0,0}}, 4, CELL_I },
    /* J */ { {{1,0,0,0},{1,1,1,0},{0,0,0,0},{0,0,0,0}}, 3, CELL_J },
    /* L */ { {{0,0,1,0},{1,1,1,0},{0,0,0,0},{0,0,0,0}}, 3, CELL_L },
    /* O */ { {{1,1,0,0},{1,1,0,0},{0,0,0,0},{0,0,0,0}}, 2, CELL_O },
    /* S */ { {{0,1,1,0},{1,1,0,0},{0,0,0,0},{0,0,0,0}}, 3, CELL_S },
    /* T */ { {{0,1,0,0},{1,1,1,0},{0,0,0,0},{0,0,0,0}}, 3, CELL_T },
    /* Z */ { {{1,1,0,0},{0,1,1,0},{0,0,0,0},{0,0,0,0}}, 3, CELL_Z },
};

static int rand_initialized = 0;

static Tetromino random_piece(void) {
    if (!rand_initialized) { srand((unsigned)time(NULL)); rand_initialized = 1; }
    return PIECES[rand() % NUM_PIECES];
}

static int drop_interval_for_level(int level) {
    int ms = 1000 - level * 100;
    return ms < 100 ? 100 : ms;
}

/* ── Collision detection ── */
static bool collides(const TetrisGame *g, int px, int py,
                     const int matrix[4][4], int size) {
    for (int row = 0; row < size; row++) {
        for (int col = 0; col < size; col++) {
            if (!matrix[row][col]) continue;
            int bx = px + col;
            int by = py + row;
            if (bx < 0 || bx >= COLS || by >= ROWS) return true;
            if (by >= 0 && g->board[by][bx] != CELL_EMPTY) return true;
        }
    }
    return false;
}

/* ── Ghost position ── */
static int ghost_y(const TetrisGame *g) {
    int gy = g->current.y;
    while (!collides(g, g->current.x, gy + 1, g->current.matrix, g->current.size))
        gy++;
    return gy;
}

/* ── Merge active piece into board ── */
static void merge_piece(TetrisGame *g) {
    const ActivePiece *p = &g->current;
    g->lock_count = 0;
    for (int row = 0; row < p->size; row++) {
        for (int col = 0; col < p->size; col++) {
            if (!p->matrix[row][col]) continue;
            int bx = p->x + col;
            int by = p->y + row;
            if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
                g->board[by][bx] = p->type;
                if (g->lock_count < 16) {
                    g->lock_x[g->lock_count] = bx;
                    g->lock_y[g->lock_count] = by;
                    g->lock_count++;
                }
            }
        }
    }
    g->lock_anim_ms = 0.0f;
}

/* ── Detect full rows ── */
static int find_clearing_rows(TetrisGame *g) {
    g->clearing_count = 0;
    for (int r = 0; r < ROWS; r++) {
        bool full = true;
        for (int c = 0; c < COLS; c++) {
            if (g->board[r][c] == CELL_EMPTY) { full = false; break; }
        }
        if (full && g->clearing_count < 4)
            g->clearing_rows[g->clearing_count++] = r;
    }
    return g->clearing_count;
}

/* ── Actually remove cleared rows ── */
static void apply_clear(TetrisGame *g) {
    static const int line_scores[5] = {0, 40, 100, 300, 1200};
    int n = g->clearing_count;
    int gained = line_scores[n] * (g->level + 1);
    g->score += gained;
    g->level = g->score / 400;
    g->drop_interval_ms = drop_interval_for_level(g->level);

    /* Remove cleared rows from bottom to top so indices stay valid */
    for (int i = n - 1; i >= 0; i--) {
        int r = g->clearing_rows[i];
        for (int above = r; above > 0; above--)
            memcpy(g->board[above], g->board[above-1], sizeof(g->board[0]));
        memset(g->board[0], 0, sizeof(g->board[0]));
    }
    g->clearing_count = 0;
}

/* ── Spawn next piece ── */
static bool spawn(TetrisGame *g) {
    Tetromino t  = g->next_piece;
    g->next_piece = random_piece();

    ActivePiece p;
    memset(&p, 0, sizeof(p));
    p.size = t.size;
    p.type = t.type;
    for (int r = 0; r < 4; r++)
        for (int c = 0; c < 4; c++)
            p.matrix[r][c] = t.shape[r][c];
    p.x = (COLS - p.size) / 2;
    p.y = -1;

    if (collides(g, p.x, p.y, p.matrix, p.size)) {
        g->state = GAME_OVER;
        return false;
    }
    g->current    = p;
    g->has_current = true;
    return true;
}

/* ── Trigger shake ── */
static void trigger_shake(TetrisGame *g) {
    g->shake    = true;
    g->shake_ms = 0.0f;
}

/* ── Public: init / reset ── */
void tetris_init(TetrisGame *g) {
    memset(g, 0, sizeof(*g));
    g->next_piece        = random_piece();
    g->drop_interval_ms  = 1000;
    g->state             = GAME_PLAYING;
    spawn(g);
}

void tetris_reset(TetrisGame *g) {
    tetris_init(g);
}

/* ── Public: player actions ── */
void tetris_move_left(TetrisGame *g) {
    if (g->state != GAME_PLAYING || !g->has_current) return;
    if (!collides(g, g->current.x - 1, g->current.y,
                  g->current.matrix, g->current.size))
        g->current.x--;
}

void tetris_move_right(TetrisGame *g) {
    if (g->state != GAME_PLAYING || !g->has_current) return;
    if (!collides(g, g->current.x + 1, g->current.y,
                  g->current.matrix, g->current.size))
        g->current.x++;
}

void tetris_rotate(TetrisGame *g) {
    if (g->state != GAME_PLAYING || !g->has_current) return;

    int sz = g->current.size;
    int rot[4][4] = {0};

    /* 90° clockwise: rot[col][sz-1-row] = orig[row][col] */
    for (int r = 0; r < sz; r++)
        for (int c = 0; c < sz; c++)
            rot[c][sz-1-r] = g->current.matrix[r][c];

    /* Try rotation, then wall-kick ±1 */
    int kicks[] = {0, 1, -1, 2, -2};
    for (int k = 0; k < 5; k++) {
        if (!collides(g, g->current.x + kicks[k], g->current.y, rot, sz)) {
            g->current.x += kicks[k];
            memcpy(g->current.matrix, rot, sizeof(rot));
            g->hud_flash    = true;
            g->hud_flash_ms = 0.0f;
            return;
        }
    }
}

void tetris_soft_drop(TetrisGame *g) {
    if (g->state != GAME_PLAYING || !g->has_current) return;
    g->drop_acc_ms = 0.0f;

    if (!collides(g, g->current.x, g->current.y + 1,
                  g->current.matrix, g->current.size)) {
        g->current.y++;
    } else {
        /* Lock */
        merge_piece(g);
        g->has_current = false;
        if (find_clearing_rows(g) > 0) {
            g->state         = GAME_CLEARING;
            g->clear_anim_ms = 0.0f;
            trigger_shake(g);
        } else {
            spawn(g);
        }
    }
}

void tetris_hard_drop(TetrisGame *g) {
    if (g->state != GAME_PLAYING || !g->has_current) return;
    g->current.y    = ghost_y(g);
    g->drop_flash   = true;
    g->drop_flash_ms = 0.0f;
    trigger_shake(g);
    g->drop_acc_ms = (float)g->drop_interval_ms; /* force immediate lock */
}

void tetris_restart(TetrisGame *g) {
    tetris_reset(g);
}

/* ── Update (called every frame with delta_ms) ── */
void tetris_update(TetrisGame *g, float delta_ms) {

    /* ── Animate effects ── */
    if (g->shake) {
        g->shake_ms += delta_ms;
        float t = g->shake_ms / SHAKE_DURATION_MS;
        if (t >= 1.0f) {
            g->shake = false; g->shake_ox = 0; g->shake_oy = 0;
        } else {
            float angle = t * 10.0f * 3.14159f;
            float amp   = (1.0f - t) * 4.0f;
            g->shake_ox = sinf(angle) * amp;
            g->shake_oy = cosf(angle * 1.3f) * amp * 0.5f;
        }
    }
    if (g->drop_flash) {
        g->drop_flash_ms += delta_ms;
        if (g->drop_flash_ms >= FLASH_DURATION_MS) g->drop_flash = false;
    }
    if (g->hud_flash) {
        g->hud_flash_ms += delta_ms;
        if (g->hud_flash_ms >= HUD_FLASH_DURATION_MS) g->hud_flash = false;
    }
    if (g->lock_count > 0) {
        g->lock_anim_ms += delta_ms;
        if (g->lock_anim_ms >= LOCK_ANIM_DURATION_MS) g->lock_count = 0;
    }

    /* ── Line-clear animation ── */
    if (g->state == GAME_CLEARING) {
        g->clear_anim_ms += delta_ms;
        if (g->clear_anim_ms >= CLEAR_ANIM_DURATION_MS) {
            apply_clear(g);
            g->state = GAME_PLAYING;
            spawn(g);
        }
        return; /* no drop during animation */
    }

    if (g->state != GAME_PLAYING) return;

    /* ── Gravity ── */
    if (!g->has_current) {
        spawn(g);
        return;
    }
    g->drop_acc_ms += delta_ms;
    if (g->drop_acc_ms >= (float)g->drop_interval_ms) {
        tetris_soft_drop(g);
    }
}

/* ── Build display board ── */
void tetris_get_display_board(const TetrisGame *g, CellType out[ROWS][COLS]) {
    memcpy(out, g->board, sizeof(g->board));

    if (!g->has_current) return;

    /* Ghost */
    int gy = ghost_y(g);
    if (gy != g->current.y) {
        for (int r = 0; r < g->current.size; r++)
            for (int c = 0; c < g->current.size; c++) {
                if (!g->current.matrix[r][c]) continue;
                int bx = g->current.x + c, by = gy + r;
                if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS)
                    if (out[by][bx] == CELL_EMPTY)
                        out[by][bx] = CELL_GHOST;
            }
    }

    /* Active piece (overwrites ghost if overlap) */
    for (int r = 0; r < g->current.size; r++)
        for (int c = 0; c < g->current.size; c++) {
            if (!g->current.matrix[r][c]) continue;
            int bx = g->current.x + c, by = g->current.y + r;
            if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS)
                out[by][bx] = g->current.type;
        }
}

bool tetris_row_is_clearing(const TetrisGame *g, int row) {
    for (int i = 0; i < g->clearing_count; i++)
        if (g->clearing_rows[i] == row) return true;
    return false;
}

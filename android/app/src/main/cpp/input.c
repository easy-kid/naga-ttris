#include "input.h"
#include <string.h>

#define DAS_INITIAL_MS 180.0f
#define DAS_REPEAT_MS   40.0f

void input_init(InputState *inp) {
    memset(inp, 0, sizeof(*inp));
    inp->held           = BTN_NONE;
    inp->pointer_id     = -1;
    inp->das_initial_ms = DAS_INITIAL_MS;
    inp->das_repeat_ms  = DAS_REPEAT_MS;
}

/*
 * Layout (portrait orientation):
 *
 *   Controls area is split into 3 rows:
 *     Row 0 (top):    [ ROTATE ] — full width
 *     Row 1 (mid):    [ < ] [ DROP ] [ > ]
 *     Row 2 (bot):    [ INSTANT_GRAVITY ] — full width
 *
 *   Rows are equal height with a small gap between them.
 *   RESTART button overlays the centre of the game board.
 */
void input_set_layout(InputState *inp,
                      float sw, float cy, float ch,
                      float bx, float by, float bw, float bh,
                      bool game_over) {
    float gap  = ch * 0.02f;
    float row_h = (ch - gap * 2.0f) / 3.0f;
    float pad   = sw * 0.04f;

    /* Row y positions */
    float r0y = cy;
    float r1y = r0y + row_h + gap;
    float r2y = r1y + row_h + gap;

    /* Full-width buttons */
    inp->zones[BTN_ROTATE]    = (ButtonZone){ pad, r0y, sw - pad*2, row_h, !game_over };
    inp->zones[BTN_HARD_DROP] = (ButtonZone){ pad, r2y, sw - pad*2, row_h, !game_over };

    /* Three-column middle row */
    float col_w = (sw - pad*2 - gap*2) / 3.0f;
    float c0x = pad;
    float c1x = c0x + col_w + gap;
    float c2x = c1x + col_w + gap;
    inp->zones[BTN_LEFT]      = (ButtonZone){ c0x, r1y, col_w, row_h, !game_over };
    inp->zones[BTN_SOFT_DROP] = (ButtonZone){ c1x, r1y, col_w, row_h, !game_over };
    inp->zones[BTN_RIGHT]     = (ButtonZone){ c2x, r1y, col_w, row_h, !game_over };

    /* RESTART button: centred in the board area */
    float rbw = bw * 0.55f;
    float rbh = row_h;
    inp->zones[BTN_RESTART] = (ButtonZone){
        bx + (bw - rbw) * 0.5f,
        by + (bh - rbh) * 0.5f + row_h,
        rbw, rbh,
        game_over
    };
}

static bool zone_hit(const ButtonZone *z, float x, float y) {
    return z->active &&
           x >= z->x && x <= z->x + z->w &&
           y >= z->y && y <= z->y + z->h;
}

static ButtonId find_button(const InputState *inp, float x, float y) {
    for (int i = 0; i < BTN_COUNT; i++)
        if (zone_hit(&inp->zones[i], x, y)) return (ButtonId)i;
    return BTN_NONE;
}

/* Android action codes we care about */
#define ACTION_DOWN   0
#define ACTION_UP     1
#define ACTION_MOVE   2
#define ACTION_CANCEL 3
/* Pointer-specific (masked) */
#define ACTION_PDOWN  5
#define ACTION_PUP    6

void input_on_touch(InputState *inp, int action, int pointer_id,
                    float x, float y) {
    int masked = action & 0xFF;

    if (masked == ACTION_DOWN || masked == ACTION_PDOWN) {
        if (inp->held == BTN_NONE) {
            ButtonId btn = find_button(inp, x, y);
            if (btn != BTN_NONE) {
                inp->held        = btn;
                inp->pointer_id  = pointer_id;
                inp->das_acc_ms  = 0.0f;
                inp->das_triggered = false;
                /* Mark as "just pressed" so update() fires immediately */
                inp->das_acc_ms = -1.0f; /* sentinel: fire on first update */
            }
        }
    } else if (masked == ACTION_UP || masked == ACTION_PUP ||
               masked == ACTION_CANCEL) {
        if (pointer_id == inp->pointer_id) {
            inp->held       = BTN_NONE;
            inp->pointer_id = -1;
        }
    }
}

static void fire_action(ButtonId btn, TetrisGame *game) {
    switch (btn) {
        case BTN_ROTATE:    tetris_rotate(game);     break;
        case BTN_LEFT:      tetris_move_left(game);  break;
        case BTN_RIGHT:     tetris_move_right(game); break;
        case BTN_SOFT_DROP: tetris_soft_drop(game);  break;
        case BTN_HARD_DROP: tetris_hard_drop(game);  break;
        case BTN_RESTART:   tetris_restart(game);    break;
        default: break;
    }
}

static bool needs_das(ButtonId btn) {
    return btn == BTN_LEFT || btn == BTN_RIGHT || btn == BTN_SOFT_DROP;
}

void input_update(InputState *inp, TetrisGame *game, float delta_ms) {
    if (inp->held == BTN_NONE) return;

    /* Sentinel: first frame press → fire immediately */
    if (inp->das_acc_ms < 0.0f) {
        fire_action(inp->held, game);
        if (!needs_das(inp->held)) {
            /* One-shot buttons: release immediately after firing */
            inp->held       = BTN_NONE;
            inp->pointer_id = -1;
        } else {
            inp->das_acc_ms = 0.0f;
        }
        return;
    }

    if (!needs_das(inp->held)) return; /* held but no repeat (e.g. ROTATE kept pressed) */

    inp->das_acc_ms += delta_ms;

    if (!inp->das_triggered) {
        if (inp->das_acc_ms >= inp->das_initial_ms) {
            inp->das_triggered = true;
            inp->das_acc_ms    = 0.0f;
            fire_action(inp->held, game);
        }
    } else {
        if (inp->das_acc_ms >= inp->das_repeat_ms) {
            inp->das_acc_ms -= inp->das_repeat_ms;
            fire_action(inp->held, game);
        }
    }
}

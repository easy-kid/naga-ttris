#ifndef INPUT_H
#define INPUT_H

#include "tetris.h"
#include <stdbool.h>

/*
 * Touch-based input system.
 *
 * The screen is divided into named button zones that map onto
 * tetris actions.  Zones are recomputed by input_set_layout()
 * whenever the screen size or layout changes.
 *
 * DAS (Delayed Auto Shift) is implemented for LEFT, RIGHT, and
 * SOFT_DROP buttons.
 */

typedef enum {
    BTN_NONE       = -1,
    BTN_ROTATE     = 0,
    BTN_LEFT       = 1,
    BTN_SOFT_DROP  = 2,
    BTN_RIGHT      = 3,
    BTN_HARD_DROP  = 4,
    BTN_RESTART    = 5,   /* game-over screen only */
    BTN_COUNT      = 6
} ButtonId;

typedef struct {
    float x, y, w, h;    /* pixel rect (top-left origin) */
    bool  active;         /* visible / hittable right now */
} ButtonZone;

typedef struct {
    ButtonZone zones[BTN_COUNT];

    /* Which button finger is currently holding (-1 = none) */
    ButtonId   held;
    int        pointer_id;

    /* DAS state */
    float      das_initial_ms;  /* delay before repeat starts (180 ms) */
    float      das_repeat_ms;   /* repeat period (40 ms) */
    float      das_acc_ms;      /* accumulated hold time */
    bool       das_triggered;   /* initial delay elapsed */
} InputState;

/* Call once to initialise with default DAS timings */
void input_init(InputState *inp);

/*
 * Update layout rectangles.  Call whenever screen size changes or
 * during frame setup before processing events.
 *
 * Parameters mirror the Layout computed in renderer.c:
 *   controls_y   – top of the controls area (pixels from top)
 *   controls_h   – total height of controls area
 *   screen_w     – screen width
 *   game_over    – if true, only BTN_RESTART is active
 *
 * Board y / height needed to position the RESTART button.
 */
void input_set_layout(InputState *inp,
                      float screen_w, float controls_y, float controls_h,
                      float board_x,  float board_y,
                      float board_w,  float board_h,
                      bool  game_over);

/* Call for each AInputEvent of type AINPUT_EVENT_TYPE_MOTION */
void input_on_touch(InputState *inp, int action, int pointer_id,
                    float x, float y);

/* Call every frame with delta_ms; fires actions into the game */
void input_update(InputState *inp, TetrisGame *game, float delta_ms);

#endif /* INPUT_H */

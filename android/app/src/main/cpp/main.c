/*
 * main.c — NativeActivity entry point for SB-TETRIS
 *
 * Architecture:
 *   android_main() is called by the NDK glue on a dedicated thread.
 *   We run a tight loop:
 *     1. Drain Android event queue (window, input, lifecycle)
 *     2. Update game logic with elapsed milliseconds
 *     3. Render frame via OpenGL ES 2.0
 *     4. Swap EGL buffers
 */

#include <android_native_app_glue.h>
#include <android/log.h>
#include <android/input.h>
#include <time.h>
#include <string.h>

#include "tetris.h"
#include "renderer.h"
#include "input.h"

#define TAG "SB-TETRIS"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO,  TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, TAG, __VA_ARGS__)

/* ── Application state ── */
typedef struct {
    struct android_app *app;

    Renderer    renderer;
    TetrisGame  game;
    InputState  input;

    bool        paused;
    int64_t     last_ns;   /* nanoseconds timestamp of last frame */
} AppState;

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */
static int64_t now_ns(void) {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (int64_t)ts.tv_sec * 1000000000LL + ts.tv_nsec;
}

static float delta_ms_from(int64_t *last) {
    int64_t now = now_ns();
    float   ms  = (float)(now - *last) / 1e6f;
    *last = now;
    if (ms > 100.0f) ms = 100.0f; /* cap at 100 ms to avoid spiral of death */
    return ms;
}

/* ─────────────────────────────────────────────
   Touch event routing
   ───────────────────────────────────────────── */
static void handle_input_event(AppState *s, AInputEvent *event) {
    if (AInputEvent_getType(event) != AINPUT_EVENT_TYPE_MOTION) return;

    int32_t action     = AMotionEvent_getAction(event);
    int32_t masked     = action & AMOTION_EVENT_ACTION_MASK;
    int32_t ptr_idx    = (action & AMOTION_EVENT_ACTION_POINTER_INDEX_MASK)
                         >> AMOTION_EVENT_ACTION_POINTER_INDEX_SHIFT;
    int32_t ptr_id     = (int32_t)AMotionEvent_getPointerId(event, (size_t)ptr_idx);
    float   x          = AMotionEvent_getX(event, (size_t)ptr_idx);
    float   y          = AMotionEvent_getY(event, (size_t)ptr_idx);

    /* Map Android action constants to the simple codes input.c expects */
    int simple_action = masked; /* same numeric values for DOWN/UP/MOVE/CANCEL */

    input_on_touch(&s->input, simple_action, ptr_id, x, y);
}

/* ─────────────────────────────────────────────
   android_native_app_glue callbacks
   ───────────────────────────────────────────── */
static int32_t on_input(struct android_app *app, AInputEvent *event) {
    AppState *s = (AppState *)app->userData;
    handle_input_event(s, event);
    return 1; /* consumed */
}

static void on_cmd(struct android_app *app, int32_t cmd) {
    AppState *s = (AppState *)app->userData;

    switch (cmd) {
        case APP_CMD_INIT_WINDOW:
            if (app->window) {
                renderer_init(&s->renderer, app->window);
                /* First layout → update input zones */
                const Layout *L = renderer_layout(&s->renderer);
                input_set_layout(&s->input,
                    L->screen_w, L->controls_y, L->controls_h,
                    L->board_x,  L->board_y,
                    L->board_w,  L->board_h,
                    s->game.state == GAME_OVER);
                s->paused   = false;
                s->last_ns  = now_ns();
            }
            break;

        case APP_CMD_TERM_WINDOW:
            renderer_destroy(&s->renderer);
            break;

        case APP_CMD_WINDOW_RESIZED:
        case APP_CMD_CONFIG_CHANGED: {
            int32_t w = ANativeWindow_getWidth(app->window);
            int32_t h = ANativeWindow_getHeight(app->window);
            renderer_resize(&s->renderer, w, h);
            const Layout *L = renderer_layout(&s->renderer);
            input_set_layout(&s->input,
                L->screen_w, L->controls_y, L->controls_h,
                L->board_x,  L->board_y,
                L->board_w,  L->board_h,
                s->game.state == GAME_OVER);
            break;
        }

        case APP_CMD_GAINED_FOCUS:
            s->paused  = false;
            s->last_ns = now_ns();
            break;

        case APP_CMD_LOST_FOCUS:
            s->paused = true;
            break;

        case APP_CMD_SAVE_STATE:
            break;

        default:
            break;
    }
}

/* ─────────────────────────────────────────────
   Entry point
   ───────────────────────────────────────────── */
void android_main(struct android_app *app) {
    AppState s;
    memset(&s, 0, sizeof(s));
    s.app    = app;
    s.paused = true;

    /* Init game and input */
    tetris_init(&s.game);
    input_init(&s.input);

    /* Register callbacks */
    app->userData     = &s;
    app->onAppCmd     = on_cmd;
    app->onInputEvent = on_input;

    LOGI("SB-TETRIS starting");

    /* ── Main loop ── */
    while (!app->destroyRequested) {
        /* Process events */
        int         events;
        struct android_poll_source *source;
        /* Block when paused (timeout=-1), poll when animating (timeout=0) */
        int timeout = (s.paused || !s.renderer.ready) ? -1 : 0;
        while (ALooper_pollOnce(timeout, NULL, &events, (void **)&source) >= 0) {
            if (source) source->process(app, source);
            if (app->destroyRequested) break;
            /* After processing events, switch to non-blocking poll */
            timeout = 0;
        }

        if (app->destroyRequested) break;
        if (s.paused || !s.renderer.ready) continue;

        /* Delta time */
        float delta = delta_ms_from(&s.last_ns);

        /* Process held touch inputs (DAS) */
        input_update(&s.input, &s.game, delta);

        /* Update game logic */
        tetris_update(&s.game, delta);

        /* Refresh input zones (game-over toggles RESTART button) */
        {
            const Layout *L = renderer_layout(&s.renderer);
            input_set_layout(&s.input,
                L->screen_w, L->controls_y, L->controls_h,
                L->board_x,  L->board_y,
                L->board_w,  L->board_h,
                s.game.state == GAME_OVER);
        }

        /* Render */
        renderer_draw(&s.renderer, &s.game, &s.input, delta);
    }

    renderer_destroy(&s.renderer);
    LOGI("SB-TETRIS exiting");
}

#ifndef RENDERER_H
#define RENDERER_H

#include "tetris.h"
#include "input.h"
#include <EGL/egl.h>
#include <GLES2/gl2.h>
#include <stdbool.h>
#include <time.h>

/*
 * All screen dimensions are derived at runtime — never hardcoded.
 * See calculate_layout() in renderer.c.
 */
typedef struct {
    float screen_w, screen_h;

    /* Board */
    float cell_size;
    float board_x, board_y;
    float board_w, board_h;

    /* Header */
    float header_h;

    /* Visor (next-piece circle) */
    float visor_cx, visor_cy, visor_r;

    /* Controls */
    float controls_y, controls_h;
    float btn_h, btn_gap;

    /* Typography — font "pixels" per display pixel */
    float scale_normal;   /* general HUD text  */
    float scale_small;    /* metadata labels   */
    float scale_large;    /* score / clock     */

    /* Padding */
    float pad;
} Layout;

typedef struct {
    EGLDisplay egl_display;
    EGLSurface egl_surface;
    EGLContext egl_context;
    int32_t    width, height;
    bool       ready;

    /* Flat-colour shader */
    GLuint flat_prog;
    GLint  flat_u_proj;
    GLint  flat_u_col;
    GLuint flat_vbo;

    /* Ortho projection (col-major) */
    float proj[16];

    /* Scanline animation */
    float scanline_y;    /* pixels from top */

    Layout layout;
} Renderer;

/* Lifecycle */
int  renderer_init  (Renderer *r, EGLNativeWindowType window);
void renderer_resize(Renderer *r, int32_t w, int32_t h);
void renderer_destroy(Renderer *r);

/* Draw a full frame */
void renderer_draw(Renderer *r, const TetrisGame *game,
                   const InputState *inp, float delta_ms);

/* Expose layout so input.c can position touch zones */
const Layout *renderer_layout(const Renderer *r);

#endif /* RENDERER_H */

#include "renderer.h"
#include "font.h"
#include <GLES2/gl2.h>
#include <android/log.h>
#include <math.h>
#include <string.h>
#include <stdio.h>
#include <time.h>

#define TAG "SB-TETRIS"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO,  TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, TAG, __VA_ARGS__)

/* ══════════════════════════════════════════════
   Orthographic projection (origin top-left)
   ══════════════════════════════════════════════ */
static void ortho(float *m, float w, float h) {
    memset(m, 0, 16*sizeof(float));
    m[0]  =  2.0f / w;
    m[5]  = -2.0f / h;
    m[10] = -1.0f;
    m[12] = -1.0f;
    m[13] =  1.0f;
    m[15] =  1.0f;
}

/* ══════════════════════════════════════════════
   Flat-colour shader
   ══════════════════════════════════════════════ */
static const char *FLAT_VS =
    "attribute vec2 a_pos;\n"
    "uniform mat4 u_proj;\n"
    "void main(){ gl_Position = u_proj * vec4(a_pos,0.0,1.0); }\n";

static const char *FLAT_FS =
    "precision mediump float;\n"
    "uniform vec4 u_col;\n"
    "void main(){ gl_FragColor = u_col; }\n";

static GLuint compile_shader(GLenum type, const char *src) {
    GLuint sh = glCreateShader(type);
    glShaderSource(sh, 1, &src, NULL);
    glCompileShader(sh);
    GLint ok = 0; glGetShaderiv(sh, GL_COMPILE_STATUS, &ok);
    if (!ok) {
        char buf[512]; glGetShaderInfoLog(sh, 512, NULL, buf);
        LOGE("Shader error: %s", buf);
    }
    return sh;
}

static GLuint build_program(const char *vs_src, const char *fs_src) {
    GLuint v = compile_shader(GL_VERTEX_SHADER,   vs_src);
    GLuint f = compile_shader(GL_FRAGMENT_SHADER, fs_src);
    GLuint p = glCreateProgram();
    glAttachShader(p, v); glAttachShader(p, f);
    glBindAttribLocation(p, 0, "a_pos");
    glLinkProgram(p);
    glDeleteShader(v); glDeleteShader(f);
    return p;
}

/* ══════════════════════════════════════════════
   Adaptive layout
   ══════════════════════════════════════════════ */
static void calculate_layout(Layout *L, float sw, float sh) {
    L->screen_w = sw;
    L->screen_h = sh;
    L->pad      = sw * 0.04f;

    L->header_h   = sh * 0.18f;
    L->controls_h = sh * 0.28f;
    L->controls_y = sh - L->controls_h;

    float area_h = sh - L->header_h - L->controls_h;
    float area_w = sw - 2.0f * L->pad;

    float cell_w = area_w / (float)COLS;
    float cell_h = area_h / (float)ROWS;
    L->cell_size = cell_w < cell_h ? cell_w : cell_h;

    L->board_w = L->cell_size * COLS;
    L->board_h = L->cell_size * ROWS;
    L->board_x = (sw - L->board_w) * 0.5f;
    L->board_y = L->header_h + (area_h - L->board_h) * 0.5f;

    /* Visor centred in header */
    L->visor_r  = L->header_h * 0.33f;
    L->visor_cx = sw * 0.5f;
    L->visor_cy = L->header_h * 0.48f;

    /* Button metrics (used by renderer for drawing labels) */
    L->btn_gap = L->controls_h * 0.02f;
    L->btn_h   = (L->controls_h - L->btn_gap * 2.0f) / 3.0f;

    /* Font scales: 1 font-pixel = scale display-pixels */
    L->scale_normal = L->cell_size * 0.13f;
    L->scale_small  = L->cell_size * 0.09f;
    L->scale_large  = L->cell_size * 0.16f;
    /* Clamp so text stays readable on very small screens */
    if (L->scale_small  < 1.0f) L->scale_small  = 1.0f;
    if (L->scale_normal < 1.5f) L->scale_normal = 1.5f;
    if (L->scale_large  < 1.5f) L->scale_large  = 1.5f;
}

/* ══════════════════════════════════════════════
   EGL initialisation
   ══════════════════════════════════════════════ */
int renderer_init(Renderer *r, EGLNativeWindowType window) {
    memset(r, 0, sizeof(*r));

    r->egl_display = eglGetDisplay(EGL_DEFAULT_DISPLAY);
    eglInitialize(r->egl_display, NULL, NULL);

    EGLint attribs[] = {
        EGL_RENDERABLE_TYPE, EGL_OPENGL_ES2_BIT,
        EGL_SURFACE_TYPE,    EGL_WINDOW_BIT,
        EGL_BLUE_SIZE,  8,
        EGL_GREEN_SIZE, 8,
        EGL_RED_SIZE,   8,
        EGL_NONE
    };
    EGLConfig cfg; EGLint num_cfg;
    eglChooseConfig(r->egl_display, attribs, &cfg, 1, &num_cfg);

    EGLint ctx_attribs[] = { EGL_CONTEXT_CLIENT_VERSION, 2, EGL_NONE };
    r->egl_context = eglCreateContext(r->egl_display, cfg, EGL_NO_CONTEXT, ctx_attribs);
    r->egl_surface = eglCreateWindowSurface(r->egl_display, cfg, window, NULL);
    eglMakeCurrent(r->egl_display, r->egl_surface, r->egl_surface, r->egl_context);

    EGLint w, h;
    eglQuerySurface(r->egl_display, r->egl_surface, EGL_WIDTH,  &w);
    eglQuerySurface(r->egl_display, r->egl_surface, EGL_HEIGHT, &h);
    r->width  = w;
    r->height = h;

    /* Build shaders */
    r->flat_prog  = build_program(FLAT_VS, FLAT_FS);
    r->flat_u_proj = glGetUniformLocation(r->flat_prog, "u_proj");
    r->flat_u_col  = glGetUniformLocation(r->flat_prog, "u_col");
    glGenBuffers(1, &r->flat_vbo);

    /* Font */
    font_init();

    /* Layout */
    calculate_layout(&r->layout, (float)w, (float)h);
    ortho(r->proj, (float)w, (float)h);

    glClearColor(0.0f, 0.0f, 0.0f, 1.0f);
    glEnable(GL_BLEND);
    glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);

    r->ready = true;
    LOGI("Renderer init %dx%d", w, h);
    return 0;
}

void renderer_resize(Renderer *r, int32_t w, int32_t h) {
    r->width  = w;
    r->height = h;
    glViewport(0, 0, w, h);
    calculate_layout(&r->layout, (float)w, (float)h);
    ortho(r->proj, (float)w, (float)h);
}

void renderer_destroy(Renderer *r) {
    if (!r->ready) return;
    font_destroy();
    if (r->flat_vbo)  glDeleteBuffers(1, &r->flat_vbo);
    if (r->flat_prog) glDeleteProgram(r->flat_prog);
    eglMakeCurrent(r->egl_display, EGL_NO_SURFACE, EGL_NO_SURFACE, EGL_NO_CONTEXT);
    eglDestroyContext(r->egl_display, r->egl_context);
    eglDestroySurface(r->egl_display, r->egl_surface);
    eglTerminate(r->egl_display);
    r->ready = false;
}

const Layout *renderer_layout(const Renderer *r) { return &r->layout; }

/* ══════════════════════════════════════════════
   Drawing primitives (all in screen-space pixels)
   ══════════════════════════════════════════════ */
static void draw_rect_rgba(Renderer *r, float x, float y, float w, float h,
                            float rc, float gc, float bc, float ac) {
    float verts[12] = {
        x,   y,
        x+w, y,
        x,   y+h,
        x+w, y,
        x+w, y+h,
        x,   y+h
    };
    glUseProgram(r->flat_prog);
    glUniformMatrix4fv(r->flat_u_proj, 1, GL_FALSE, r->proj);
    glUniform4f(r->flat_u_col, rc, gc, bc, ac);
    glBindBuffer(GL_ARRAY_BUFFER, r->flat_vbo);
    glBufferData(GL_ARRAY_BUFFER, sizeof(verts), verts, GL_DYNAMIC_DRAW);
    glEnableVertexAttribArray(0);
    glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, 0, 0);
    glDrawArrays(GL_TRIANGLES, 0, 6);
    glDisableVertexAttribArray(0);
    glBindBuffer(GL_ARRAY_BUFFER, 0);
}

/* Outlined rectangle (4 border lines each `t` pixels thick) */
static void draw_rect_outline(Renderer *r, float x, float y, float w, float h,
                               float t, float rc, float gc, float bc, float ac) {
    draw_rect_rgba(r, x,       y,       w, t, rc, gc, bc, ac);  /* top    */
    draw_rect_rgba(r, x,       y+h-t,   w, t, rc, gc, bc, ac);  /* bottom */
    draw_rect_rgba(r, x,       y,       t, h, rc, gc, bc, ac);  /* left   */
    draw_rect_rgba(r, x+w-t,   y,       t, h, rc, gc, bc, ac);  /* right  */
}

/* Inset border — simulates CSS box-shadow: inset 0 0 0 Npx #FFF */
static void draw_cell_inset(Renderer *r, float x, float y, float s, float inset,
                             float rc, float gc, float bc, float ac) {
    draw_rect_outline(r, x+inset, y+inset, s-inset*2, s-inset*2, inset, rc, gc, bc, ac);
}

/* Circle approximated with triangle fan (n segments) */
static void draw_circle_outline(Renderer *r, float cx, float cy, float radius,
                                 float t, int segs,
                                 float rc, float gc, float bc, float ac) {
    for (int i = 0; i < segs; i++) {
        float a0 = (float)i       / (float)segs * 6.28318f;
        float a1 = (float)(i+1)   / (float)segs * 6.28318f;
        float x0 = cx + cosf(a0) * (radius - t), y0 = cy + sinf(a0) * (radius - t);
        float x1 = cx + cosf(a1) * (radius - t), y1 = cy + sinf(a1) * (radius - t);
        float x2 = cx + cosf(a1) * radius,        y2 = cy + sinf(a1) * radius;
        float x3 = cx + cosf(a0) * radius,        y3 = cy + sinf(a0) * radius;
        float verts[12] = { x0,y0, x1,y1, x2,y2, x0,y0, x2,y2, x3,y3 };
        glUseProgram(r->flat_prog);
        glUniformMatrix4fv(r->flat_u_proj, 1, GL_FALSE, r->proj);
        glUniform4f(r->flat_u_col, rc, gc, bc, ac);
        glBindBuffer(GL_ARRAY_BUFFER, r->flat_vbo);
        glBufferData(GL_ARRAY_BUFFER, sizeof(verts), verts, GL_DYNAMIC_DRAW);
        glEnableVertexAttribArray(0);
        glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, 0, 0);
        glDrawArrays(GL_TRIANGLES, 0, 6);
        glDisableVertexAttribArray(0);
    }
    glBindBuffer(GL_ARRAY_BUFFER, 0);
}

/* ── Text helpers ── */
static void draw_text_centered(Renderer *r, const char *str, float cx, float y,
                                float scale, float rc, float gc, float bc, float ac) {
    float tw = font_text_width(str, scale);
    font_draw_text(str, cx - tw*0.5f, y, scale, rc, gc, bc, ac, r->proj);
}

static void draw_text_right(Renderer *r, const char *str, float rx, float y,
                             float scale, float rc, float gc, float bc, float ac) {
    float tw = font_text_width(str, scale);
    font_draw_text(str, rx - tw, y, scale, rc, gc, bc, ac, r->proj);
}

/* Corner bracket ornaments on board */
static void draw_corner_brackets(Renderer *r, float bx, float by,
                                  float bw, float bh, float t, float arm) {
    /* top-left */
    draw_rect_rgba(r, bx-t,      by-t,      arm+t, t,     1,1,1,1);
    draw_rect_rgba(r, bx-t,      by-t,      t,     arm+t, 1,1,1,1);
    /* top-right */
    draw_rect_rgba(r, bx+bw-arm, by-t,      arm+t, t,     1,1,1,1);
    draw_rect_rgba(r, bx+bw,     by-t,      t,     arm+t, 1,1,1,1);
    /* bottom-left */
    draw_rect_rgba(r, bx-t,      by+bh,     arm+t, t,     1,1,1,1);
    draw_rect_rgba(r, bx-t,      by+bh-arm, t,     arm+t, 1,1,1,1);
    /* bottom-right */
    draw_rect_rgba(r, bx+bw-arm, by+bh,     arm+t, t,     1,1,1,1);
    draw_rect_rgba(r, bx+bw,     by+bh-arm, t,     arm+t, 1,1,1,1);
}

/* ══════════════════════════════════════════════
   Draw next-piece preview inside visor
   ══════════════════════════════════════════════ */
static void draw_visor_piece(Renderer *r, const TetrisGame *game) {
    const Layout *L = &r->layout;
    const Tetromino *t = &game->next_piece;
    if (t->size == 0) return;

    /* Scale: fit piece inside visor (diameter = 2*r) */
    float diam  = L->visor_r * 1.3f;
    float cs    = diam / (float)t->size;
    float px    = L->visor_cx - (cs * t->size) * 0.5f;
    float py    = L->visor_cy - (cs * t->size) * 0.5f;

    float inset = cs * 0.12f < 1.0f ? 1.0f : cs * 0.12f;
    for (int row = 0; row < t->size; row++) {
        for (int col = 0; col < t->size; col++) {
            if (!t->shape[row][col]) continue;
            float cx2 = px + col * cs;
            float cy2 = py + row * cs;
            draw_rect_rgba(r, cx2, cy2, cs, cs, 0,0,0,1);
            draw_cell_inset(r, cx2, cy2, cs, inset, 1,1,1,1);
        }
    }
}

/* ══════════════════════════════════════════════
   Draw board grid + pieces
   ══════════════════════════════════════════════ */
static void draw_board(Renderer *r, const TetrisGame *game) {
    const Layout *L = &r->layout;
    float bx = L->board_x, by = L->board_y;
    float cs = L->cell_size;

    /* Faint grid lines */
    for (int row = 0; row <= ROWS; row++)
        draw_rect_rgba(r, bx, by + row*cs, L->board_w, 0.5f, 1,1,1,0.05f);
    for (int col = 0; col <= COLS; col++)
        draw_rect_rgba(r, bx + col*cs, by, 0.5f, L->board_h, 1,1,1,0.05f);

    CellType display[ROWS][COLS];
    tetris_get_display_board(game, display);

    float inset = cs * 0.12f < 1.5f ? 1.5f : cs * 0.12f;

    for (int row = 0; row < ROWS; row++) {
        float ry = by + row * cs;

        for (int col = 0; col < COLS; col++) {
            CellType cell = display[row][col];
            if (cell == CELL_EMPTY) continue;
            float cx = bx + col * cs;

            if (cell == CELL_GHOST) {
                draw_cell_inset(r, cx, ry, cs, inset, 1,1,1,0.35f);
            } else {
                /* Clearing animation: shrink + fade */
                float sx = cs, sy = cs, ax = cx, ay = ry, alpha = 1.0f;
                if (tetris_row_is_clearing(game, row)) {
                    float t2 = game->clear_anim_ms / CLEAR_ANIM_DURATION_MS;
                    sx = cs * (1.0f - t2 * 0.9f);
                    sy = cs * (1.0f - t2 * 0.9f);
                    ax = cx + (cs - sx) * 0.5f;
                    ay = ry + (cs - sy) * 0.5f;
                    alpha = 1.0f - t2;
                }
                /* Lock pulse: flash white on lock */
                float lock_t = 0.0f;
                for (int li = 0; li < game->lock_count; li++) {
                    if (game->lock_x[li] == col && game->lock_y[li] == row) {
                        lock_t = 1.0f - game->lock_anim_ms / LOCK_ANIM_DURATION_MS;
                        break;
                    }
                }
                draw_rect_rgba(r, ax, ay, sx, sy, 0,0,0,alpha);
                float bi = inset * (1.0f + lock_t * 3.0f);
                draw_cell_inset(r, ax, ay, sx, bi, 1,1,1,alpha);
            }
        }
    }

    /* Board border */
    draw_rect_outline(r, bx, by, L->board_w, L->board_h, 2.0f, 1,1,1,1);

    /* Corner brackets */
    float arm = L->cell_size * 0.6f;
    draw_corner_brackets(r, bx, by, L->board_w, L->board_h, 2.0f, arm);
}

/* ══════════════════════════════════════════════
   Draw header  (SYSTEM_CLOCK | VISOR | BYTE_COUNT)
   ══════════════════════════════════════════════ */
static void draw_header(Renderer *r, const TetrisGame *game) {
    const Layout *L = &r->layout;
    float ss = L->scale_small, sn = L->scale_normal, sl = L->scale_large;
    float fh = font_char_height(sn);
    float fhs = font_char_height(ss);

    /* ─── Left: SYSTEM_CLOCK ─── */
    float lx = L->pad;
    float ly_label = L->header_h * 0.15f;
    float ly_value = ly_label + fhs + 2.0f;

    font_draw_text("SYSTEM_CLOCK", lx, ly_label, ss, 0.63f,0.63f,0.63f,1, r->proj);

    /* Live clock */
    time_t now = time(NULL);
    struct tm *tm_info = localtime(&now);
    char clock_str[16];
    snprintf(clock_str, sizeof(clock_str), "[%02d:%02d:%02d]",
             tm_info->tm_hour, tm_info->tm_min, tm_info->tm_sec);
    font_draw_text(clock_str, lx, ly_value, sl, 1,1,1,1, r->proj);

    /* ─── Centre: NEXT_MEM / visor / BUFFER ─── */
    float top_lbl_y = L->visor_cy - L->visor_r - fhs - 2.0f;
    if (top_lbl_y < 0) top_lbl_y = 0;
    draw_text_centered(r, "NEXT_MEM", L->visor_cx, top_lbl_y, ss, 0.63f,0.63f,0.63f,1);

    /* Visor circle */
    float circ_t = 1.5f;
    draw_circle_outline(r, L->visor_cx, L->visor_cy, L->visor_r, circ_t, 48, 1,1,1,1);
    /* Cross hairs inside visor */
    draw_rect_rgba(r, L->visor_cx - L->visor_r, L->visor_cy - 0.4f,
                   L->visor_r*2, 0.8f, 1,1,1,0.15f);
    draw_rect_rgba(r, L->visor_cx - 0.4f, L->visor_cy - L->visor_r,
                   0.8f, L->visor_r*2, 1,1,1,0.15f);

    draw_visor_piece(r, game);

    char buf_str[16];
    snprintf(buf_str, sizeof(buf_str), "BUFFER_%02d", game->level);
    float bot_lbl_y = L->visor_cy + L->visor_r + 2.0f;
    draw_text_centered(r, buf_str, L->visor_cx, bot_lbl_y, ss, 0.63f,0.63f,0.63f,1);

    /* ─── Right: BYTE_COUNT ─── */
    float rx = L->screen_w - L->pad;
    float ry_label = ly_label;
    float ry_value = ly_value;

    draw_text_right(r, "BYTE_COUNT", rx, ry_label, ss, 0.63f,0.63f,0.63f,1);
    char score_str[16];
    snprintf(score_str, sizeof(score_str), "[%06d]", game->score);
    draw_text_right(r, score_str, rx, ry_value, sl, 1,1,1,1);

    /* HUD flash: thin white inset glow across the header */
    if (game->hud_flash) {
        float t = game->hud_flash_ms / HUD_FLASH_DURATION_MS;
        float a = (1.0f - t) * 0.3f;
        draw_rect_outline(r, 0, 0, L->screen_w, L->header_h, 3.0f, 1,1,1,a);
    }
}

/* ══════════════════════════════════════════════
   Draw control buttons
   ══════════════════════════════════════════════ */
static void draw_button(Renderer *r, const ButtonZone *z, const char *label,
                         float scale, bool inverted) {
    if (!z->active) return;
    float bg_r = inverted ? 1.0f : 0.0f;
    float fg_r = inverted ? 0.0f : 1.0f;
    draw_rect_rgba(r, z->x, z->y, z->w, z->h, bg_r, bg_r, bg_r, 1.0f);
    draw_rect_outline(r, z->x, z->y, z->w, z->h, 2.0f, 1,1,1,1);

    float tw = font_text_width(label, scale);
    float th = font_char_height(scale);
    float tx = z->x + (z->w - tw) * 0.5f;
    float ty = z->y + (z->h - th) * 0.5f;
    font_draw_text(label, tx, ty, scale, fg_r, fg_r, fg_r, 1.0f, r->proj);
}

static void draw_controls(Renderer *r, const InputState *inp) {
    const Layout *L = &r->layout;
    float sn = L->scale_normal;
    float ss = L->scale_small;

    /* Section label */
    const char *cmd_lbl = "COMMAND_CENTER // TACTILE_INPUT_REQUIRED";
    float lbl_y = L->controls_y - font_char_height(ss) - L->btn_gap;
    draw_text_centered(r, cmd_lbl, L->screen_w*0.5f, lbl_y, ss, 0.63f,0.63f,0.63f,1);

    draw_button(r, &inp->zones[BTN_ROTATE],    "[ ROTATE ]",       sn, false);
    draw_button(r, &inp->zones[BTN_LEFT],      "<",                 sn, false);
    draw_button(r, &inp->zones[BTN_SOFT_DROP], "DROP",             sn, false);
    draw_button(r, &inp->zones[BTN_RIGHT],     ">",                 sn, false);

    /* INSTANT_GRAVITY is inverted (white bg, black text) */
    const ButtonZone *hd = &inp->zones[BTN_HARD_DROP];
    if (hd->active) {
        draw_rect_rgba(r, hd->x, hd->y, hd->w, hd->h, 1,1,1,1);
        draw_rect_outline(r, hd->x, hd->y, hd->w, hd->h, 2.0f, 0,0,0,1);
        float sub_scale = ss;
        const char *sub = "INSTANT_GRAVITY";
        float tw = font_text_width(sub, sub_scale);
        float th = font_char_height(sub_scale);
        font_draw_text(sub, hd->x + (hd->w-tw)*0.5f,
                       hd->y + (hd->h-th)*0.5f,
                       sub_scale, 0,0,0,1, r->proj);
    }
}

/* ══════════════════════════════════════════════
   Game-over overlay
   ══════════════════════════════════════════════ */
static void draw_game_over(Renderer *r, const TetrisGame *game,
                            const InputState *inp) {
    const Layout *L = &r->layout;
    float bx = L->board_x, by = L->board_y, bw = L->board_w, bh = L->board_h;

    /* Dark overlay */
    draw_rect_rgba(r, bx, by, bw, bh, 0,0,0,0.9f);

    float cx = bx + bw * 0.5f;
    float sn = L->scale_normal;
    float ss = L->scale_small;

    /* Glitch animation: offset based on time */
    float gx = sinf(game->hud_flash_ms * 0.1f) * 2.0f;

    float fy = by + bh * 0.30f;
    draw_text_centered(r, "FATAL_ERROR", cx + gx, fy, sn, 1,0,0,1);

    fy += font_char_height(sn) + 4.0f;
    draw_text_centered(r, "HEAP_OVERFLOW", cx, fy, sn, 1,1,1,1);

    fy += font_char_height(sn) + 4.0f;
    draw_text_centered(r, "// SYSTEM_HALTED //", cx, fy, ss, 0.63f,0.63f,0.63f,1);

    /* REBOOT_SYSTEM() button */
    const ButtonZone *rb = &inp->zones[BTN_RESTART];
    if (rb->active) {
        draw_rect_rgba(r, rb->x, rb->y, rb->w, rb->h, 1,1,1,1);
        draw_rect_outline(r, rb->x, rb->y, rb->w, rb->h, 2, 0,0,0,1);
        draw_button(r, rb, "REBOOT_SYSTEM()", sn, true);
    }
}

/* ══════════════════════════════════════════════
   Scanline overlay
   ══════════════════════════════════════════════ */
static void draw_scanline(Renderer *r, float delta_ms) {
    float speed = r->layout.screen_h / 3000.0f; /* px per ms */
    r->scanline_y += delta_ms * speed;
    if (r->scanline_y > r->layout.screen_h + 12.0f) r->scanline_y = -12.0f;
    draw_rect_rgba(r, 0, r->scanline_y, r->layout.screen_w, 10.0f, 1,1,1,0.06f);
}

/* ══════════════════════════════════════════════
   Main draw call
   ══════════════════════════════════════════════ */
void renderer_draw(Renderer *r, const TetrisGame *game,
                   const InputState *inp, float delta_ms) {
    if (!r->ready) return;

    /* Apply shake offset by adjusting projection origin */
    float proj_saved[16];
    memcpy(proj_saved, r->proj, sizeof(r->proj));
    if (game->shake) {
        /* Translate projection by shake offset */
        r->proj[12] += game->shake_ox * r->proj[0];
        r->proj[13] += game->shake_oy * r->proj[5];
    }

    /* Drop-flash: invert colours for the board area */
    bool flash = game->drop_flash;

    glClear(GL_COLOR_BUFFER_BIT);

    if (flash) {
        /* White flash: draw board area white, then draw content inverted */
        draw_rect_rgba(r, r->layout.board_x, r->layout.board_y,
                       r->layout.board_w, r->layout.board_h, 1,1,1,1);
    }

    draw_header(r, game);
    draw_board(r, game);

    if (game->state == GAME_OVER)
        draw_game_over(r, game, inp);

    memcpy(r->proj, proj_saved, sizeof(r->proj));

    draw_controls(r, inp);
    draw_scanline(r, delta_ms);

    eglSwapBuffers(r->egl_display, r->egl_surface);
}

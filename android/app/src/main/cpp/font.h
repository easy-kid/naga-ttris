#ifndef FONT_H
#define FONT_H

#include <GLES2/gl2.h>
#include <stdint.h>

/*
 * 8×8 bitmap font covering printable ASCII 32-127.
 * font_init() bakes it into a GL_LUMINANCE texture atlas.
 * font_draw_text() renders a string at pixel coordinates.
 */

/* Call once after GL context is created */
void font_init(void);

/* Call when GL context is destroyed */
void font_destroy(void);

/*
 * Draw ASCII string at (px, py) in screen-space pixels (origin top-left).
 * scale: logical pixel size of one font pixel (e.g. 2.0 = 16×16 char)
 * r,g,b,a: text colour in [0..1]
 * proj: column-major 4×4 orthographic matrix matching the screen
 */
void font_draw_text(const char *text, float px, float py, float scale,
                    float r, float g, float b, float a,
                    const float proj[16]);

/* Returns rendered pixel width of text at given scale */
float font_text_width(const char *text, float scale);

/* Single char height in pixels at given scale */
float font_char_height(float scale);

#endif /* FONT_H */

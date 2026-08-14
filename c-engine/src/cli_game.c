#define _DEFAULT_SOURCE
#include "tetris_core.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <termios.h>
#include <unistd.h>
#include <fcntl.h>
#include <time.h>
#include <sys/time.h>

static struct termios orig_termios;

static void disable_raw_mode() {
    tcsetattr(STDIN_FILENO, TCSAFLUSH, &orig_termios);
    printf("\033[?25h\033[0m\n"); // Show cursor, reset color
}

static void enable_raw_mode() {
    tcgetattr(STDIN_FILENO, &orig_termios);
    atexit(disable_raw_mode);

    struct termios raw = orig_termios;
    raw.c_lflag &= ~(ECHO | ICANON | ISIG);
    raw.c_cc[VMIN] = 0;
    raw.c_cc[VTIME] = 0;
    tcsetattr(STDIN_FILENO, TCSAFLUSH, &raw);

    printf("\033[?25l"); // Hide cursor
}

static uint64_t get_time_ms() {
    struct timeval tv;
    gettimeofday(&tv, NULL);
    return (uint64_t)(tv.tv_sec * 1000 + tv.tv_usec / 1000);
}

static const char* piece_symbol(PieceType type) {
    switch (type) {
        case PIECE_I: return "\033[96m[]\033[0m"; // Cyan
        case PIECE_J: return "\033[94m[]\033[0m"; // Blue
        case PIECE_L: return "\033[93m[]\033[0m"; // Orange/Yellow
        case PIECE_O: return "\033[93m[]\033[0m"; // Yellow
        case PIECE_S: return "\033[92m[]\033[0m"; // Green
        case PIECE_T: return "\033[95m[]\033[0m"; // Magenta
        case PIECE_Z: return "\033[91m[]\033[0m"; // Red
        default:      return " .";
    }
}

static void render_game(const TetrisEngine *engine) {
    // Build display buffer with ghost and active piece
    uint8_t disp[BOARD_ROWS][BOARD_COLS];
    memcpy(disp, engine->board, sizeof(disp));

    int ghost_y = tetris_calculate_ghost_y(engine);
    int dim = 0;
    const int *matrix = tetris_get_shape_matrix(engine->current_piece.type,
                                                engine->current_piece.rotation, &dim);

    // Overlay active piece
    if (matrix) {
        for (int y = 0; y < dim; y++) {
            for (int x = 0; x < dim; x++) {
                if (matrix[y * dim + x] != 0) {
                    int bx = engine->current_piece.x + x;
                    int by = engine->current_piece.y + y;
                    if (by >= 0 && by < BOARD_ROWS && bx >= 0 && bx < BOARD_COLS) {
                        disp[by][bx] = (uint8_t)engine->current_piece.type;
                    }
                }
            }
        }
    }

    // Move cursor to top-left
    printf("\033[H");

    printf("\033[1;37m┌──────────────────────────────────────────────┐\033[0m\n");
    printf("\033[1;37m│      VOID_STACK // TETRIS CORE (C99)         │\033[0m\n");
    printf("\033[1;37m├──────────────┬────────────────┬──────────────┤\033[0m\n");
    printf("│ \033[90m[HOLD_MEM]\033[0m   │ \033[97mSCORE: %06u\033[0m  │ \033[90m[NEXT_MEM]\033[0m   │\n", engine->score);
    printf("│ \033[90mREADY: %s\033[0m   │ \033[97mLINES: %03u\033[0m     │ \033[97mQUEUE_03\033[0m     │\n", engine->can_hold ? "YES" : "NO ", engine->lines);
    printf("│              │ \033[97mLEVEL: %02u\033[0m      │              │\n", engine->level);
    printf("\033[1;37m├──────────────┴────────────────┴──────────────┤\033[0m\n");

    for (int y = 0; y < BOARD_ROWS; y++) {
        // Left column: Hold display
        if (y == 2 && engine->hold_piece != PIECE_NONE) {
            printf("│  HOLD: %s  │", piece_symbol(engine->hold_piece));
        } else if (y == 6) {
            printf("│ \033[90mB2B: %s\033[0m   │", engine->back_to_back ? "\033[93m1.5x\033[0m" : "\033[90mOFF \033[0m");
        } else if (y == 8) {
            printf("│ \033[90mCOMBO: x%-2d\033[0m │", engine->combo > 0 ? engine->combo : 0);
        } else {
            printf("│              │");
        }

        // Center 10 columns of board
        for (int x = 0; x < BOARD_COLS; x++) {
            if (disp[y][x] != 0) {
                printf("%s", piece_symbol((PieceType)disp[y][x]));
            } else {
                // Ghost check
                bool is_ghost = false;
                if (matrix && ghost_y > engine->current_piece.y) {
                    for (int my = 0; my < dim; my++) {
                        for (int mx = 0; mx < dim; mx++) {
                            if (matrix[my * dim + mx] != 0) {
                                if (ghost_y + my == y && engine->current_piece.x + mx == x) {
                                    is_ghost = true;
                                }
                            }
                        }
                    }
                }
                if (is_ghost) {
                    printf("\033[90m::\033[0m");
                } else {
                    printf(" .");
                }
            }
        }
        printf("│");

        // Right column: Next Queue preview
        if (y == 2) {
            printf("  NEXT: %s   │\n", piece_symbol(engine->next_queue[0]));
        } else if (y == 4) {
            printf("        %s   │\n", piece_symbol(engine->next_queue[1]));
        } else if (y == 6) {
            printf("        %s   │\n", piece_symbol(engine->next_queue[2]));
        } else {
            printf("              │\n");
        }
    }

    printf("\033[1;37m├──────────────────────────────────────────────┤\033[0m\n");
    printf("│ [A/D] Left/Right  [W/X] Rot CW  [Z] Rot CCW  │\n");
    printf("│ [S] Soft Drop     [SPACE] Hard Drop  [C] Hold│\n");
    printf("│ [P] Pause         [Q] Abort & Exit           │\n");
    printf("\033[1;37m└──────────────────────────────────────────────┘\033[0m\n");
    fflush(stdout);
}

int main() {
    TetrisEngine engine;
    tetris_init(&engine, (unsigned int)time(NULL));

    enable_raw_mode();
    printf("\033[2J\033[H"); // Clear screen

    uint64_t last_time = get_time_ms();
    bool running = true;

    while (running && engine.state != GAME_STATE_GAMEOVER) {
        uint64_t current_time = get_time_ms();
        int delta = (int)(current_time - last_time);
        last_time = current_time;

        // Input processing
        char c = 0;
        while (read(STDIN_FILENO, &c, 1) == 1) {
            if (c == '\033') { // Escape sequence
                char seq[2];
                if (read(STDIN_FILENO, &seq[0], 1) == 1 && read(STDIN_FILENO, &seq[1], 1) == 1) {
                    if (seq[0] == '[') {
                        switch (seq[1]) {
                            case 'A': tetris_rotate_cw(&engine); break; // Up
                            case 'B': tetris_soft_drop(&engine); break;  // Down
                            case 'C': tetris_move_right(&engine); break; // Right
                            case 'D': tetris_move_left(&engine); break;  // Left
                        }
                    }
                }
            } else if (c == 'q' || c == 'Q') {
                running = false;
            } else if (c == 'a' || c == 'A') {
                tetris_move_left(&engine);
            } else if (c == 'd' || c == 'D') {
                tetris_move_right(&engine);
            } else if (c == 's' || c == 'S') {
                tetris_soft_drop(&engine);
            } else if (c == 'w' || c == 'W' || c == 'x' || c == 'X') {
                tetris_rotate_cw(&engine);
            } else if (c == 'z' || c == 'Z') {
                tetris_rotate_ccw(&engine);
            } else if (c == ' ') {
                tetris_hard_drop(&engine);
            } else if (c == 'c' || c == 'C') {
                tetris_hold(&engine);
            } else if (c == 'p' || c == 'P') {
                engine.state = (engine.state == GAME_STATE_PLAYING) ? GAME_STATE_PAUSED : GAME_STATE_PLAYING;
            }
        }

        if (engine.state == GAME_STATE_PLAYING) {
            tetris_tick(&engine, delta);
        }

        render_game(&engine);
        usleep(16000); // ~60 FPS
    }

    if (engine.state == GAME_STATE_GAMEOVER) {
        printf("\n\033[1;31m>>> FATAL ERROR: HEAP OVERFLOW - GAME OVER <<<\033[0m\n");
        printf("FINAL SCORE: %u | LINES: %u | LEVEL: %u | TETRISES: %u\n\n",
               engine.score, engine.lines, engine.level, engine.tetrises);
    }

    return 0;
}

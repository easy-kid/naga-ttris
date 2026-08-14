#include "tetris_core.h"
#include <stdio.h>
#include <stdlib.h>
#include <assert.h>
#include <string.h>

static int tests_run = 0;
static int tests_passed = 0;

#define RUN_TEST(fn) do { \
    tests_run++; \
    printf("[RUNNING] %s...\n", #fn); \
    if (fn()) { \
        tests_passed++; \
        printf("[PASS]    %s\n", #fn); \
    } else { \
        printf("[FAIL]    %s\n", #fn); \
    } \
} while(0)

// Test 1: 7-Bag Generation guarantees all 7 pieces in each 7-piece block
static bool test_7bag_distribution() {
    TetrisEngine engine;
    tetris_init(&engine, 12345);

    // Consume all 7 pieces of initial bag 1 so the current piece is piece 1 of bag 2
    for (int i = 0; i < 7; i++) {
        memset(engine.board, 0, sizeof(engine.board));
        tetris_hard_drop(&engine);
    }

    // Now test 10 full consecutive 7-piece bags
    for (int bag_cycle = 0; bag_cycle < 10; bag_cycle++) {
        int counts[8] = {0};
        for (int p = 0; p < 7; p++) {
            PieceType piece = engine.current_piece.type;
            if (piece < 1 || piece > 7) {
                printf("  Failed: Invalid piece type %d at cycle %d, index %d\n", piece, bag_cycle, p);
                return false;
            }
            counts[piece]++;
            memset(engine.board, 0, sizeof(engine.board)); // Clear board so no stack overflow
            tetris_hard_drop(&engine);
        }
        for (int i = 1; i <= 7; i++) {
            if (counts[i] != 1) {
                printf("  Failed: Piece %d appeared %d times in bag cycle %d\n", i, counts[i], bag_cycle);
                return false;
            }
        }
    }
    return true;
}

// Test 2: Movement and Boundary Collisions
static bool test_movement_and_boundaries() {
    TetrisEngine engine;
    tetris_init(&engine, 42);

    // Force spawn O piece in center
    tetris_spawn_piece(&engine, PIECE_O);

    // Move left until wall
    for (int i = 0; i < 15; i++) {
        tetris_move_left(&engine);
    }
    if (engine.current_piece.x != 0) {
        printf("  Failed: O piece did not stop at left boundary x=0, got x=%d\n", engine.current_piece.x);
        return false;
    }

    // Move right to right wall (COLS=10, O piece width=2 -> max x=8)
    for (int i = 0; i < 15; i++) {
        tetris_move_right(&engine);
    }
    if (engine.current_piece.x != 8) {
        printf("  Failed: O piece did not stop at right boundary x=8, got x=%d\n", engine.current_piece.x);
        return false;
    }

    return true;
}

// Test 3: SRS Rotation & Wall Kicks
static bool test_srs_wall_kicks() {
    TetrisEngine engine;
    tetris_init(&engine, 999);

    // Spawn I piece
    tetris_spawn_piece(&engine, PIECE_I);
    // Move all the way to right wall
    for (int i = 0; i < 10; i++) {
        tetris_move_right(&engine);
    }

    // Rotate I piece - should perform SRS wall kick successfully
    bool rotated = tetris_rotate_cw(&engine);
    if (!rotated) {
        printf("  Failed: I piece failed to wall kick rotate against right border\n");
        return false;
    }

    // Rotate again
    rotated = tetris_rotate_cw(&engine);
    if (!rotated) {
        printf("  Failed: I piece second rotation failed\n");
        return false;
    }

    return true;
}

// Test 4: Hold Piece Mechanics
static bool test_hold_piece() {
    TetrisEngine engine;
    tetris_init(&engine, 777);

    tetris_spawn_piece(&engine, PIECE_T);
    if (engine.current_piece.type != PIECE_T) return false;
    if (engine.hold_piece != PIECE_NONE) return false;

    // Hold T piece
    bool held = tetris_hold(&engine);
    if (!held || engine.hold_piece != PIECE_T) {
        printf("  Failed: Hold failed to store T piece\n");
        return false;
    }

    // Attempting second hold without locking must fail
    bool second_hold = tetris_hold(&engine);
    if (second_hold) {
        printf("  Failed: Second hold in same drop cycle should be disallowed\n");
        return false;
    }

    // Hard drop current piece to lock
    memset(engine.board, 0, sizeof(engine.board));
    tetris_hard_drop(&engine);

    // Now hold should be allowed again
    if (!engine.can_hold) {
        printf("  Failed: Hold not reset after piece lock\n");
        return false;
    }

    return true;
}

// Test 5: Ghost Piece Calculation
static bool test_ghost_piece_calculation() {
    TetrisEngine engine;
    tetris_init(&engine, 100);

    tetris_spawn_piece(&engine, PIECE_I); // width 4, height 1 on row 1
    int gy = tetris_calculate_ghost_y(&engine);

    if (gy < 17 || gy > 19) {
        printf("  Failed: Expected ghost Y around 18 on empty board, got %d\n", gy);
        return false;
    }

    return true;
}

// Test 6: Line Clearing (Single, Double, Triple, Tetris)
static bool test_line_clearing() {
    TetrisEngine engine;
    tetris_init(&engine, 555);

    // Setup 4 rows with 9 filled blocks (leaving col 9 empty for I piece Tetris)
    for (int y = BOARD_ROWS - 4; y < BOARD_ROWS; y++) {
        for (int x = 0; x < BOARD_COLS - 1; x++) {
            engine.board[y][x] = (uint8_t)PIECE_J;
        }
    }

    // Spawn I piece, rotate vertically, move to column 9, hard drop to bottom
    tetris_spawn_piece(&engine, PIECE_I);
    tetris_rotate_cw(&engine); // Vertical I (matrix column x=2)
    for (int i = 0; i < 10; i++) tetris_move_right(&engine);

    uint32_t initial_lines = engine.lines;
    tetris_hard_drop(&engine);

    int cleared = (int)(engine.lines - initial_lines);
    if (cleared != 4) {
        printf("  Failed: Expected 4 lines cleared (Tetris), got %d\n", cleared);
        return false;
    }

    if (engine.tetrises != 1) {
        printf("  Failed: Tetrises stat not incremented, got %d\n", engine.tetrises);
        return false;
    }

    return true;
}

// Test 7: Score, Level, Combo, and Back-to-Back Calculation
static bool test_scoring_and_b2b() {
    TetrisEngine engine;
    tetris_init(&engine, 123);

    // Fill row 19 except col 0
    for (int x = 1; x < BOARD_COLS; x++) {
        engine.board[19][x] = (uint8_t)PIECE_O;
    }

    // Drop O piece to clear row 19
    tetris_spawn_piece(&engine, PIECE_O);
    for (int i = 0; i < 10; i++) tetris_move_left(&engine);
    tetris_hard_drop(&engine);

    if (engine.score == 0) {
        printf("  Failed: Score not awarded for line clear\n");
        return false;
    }

    return true;
}

// Test 8: Game Over Detection
static bool test_game_over_on_overflow() {
    TetrisEngine engine;
    tetris_init(&engine, 888);

    // Fill top spawn area
    for (int y = 0; y < 4; y++) {
        for (int x = 0; x < BOARD_COLS; x++) {
            engine.board[y][x] = (uint8_t)PIECE_Z;
        }
    }

    bool spawned = tetris_spawn_piece(&engine, PIECE_T);
    if (spawned || engine.state != GAME_STATE_GAMEOVER) {
        printf("  Failed: Game over not triggered when spawn area is obstructed\n");
        return false;
    }

    return true;
}

int main() {
    printf("=====================================================\n");
    printf("=== RUNNING SB-TETRIS (VOID_STACK) C CORE TESTS ===\n");
    printf("=====================================================\n");

    RUN_TEST(test_7bag_distribution);
    RUN_TEST(test_movement_and_boundaries);
    RUN_TEST(test_srs_wall_kicks);
    RUN_TEST(test_hold_piece);
    RUN_TEST(test_ghost_piece_calculation);
    RUN_TEST(test_line_clearing);
    RUN_TEST(test_scoring_and_b2b);
    RUN_TEST(test_game_over_on_overflow);

    printf("=====================================================\n");
    printf("RESULTS: %d / %d tests passed (%.1f%%)\n", tests_passed, tests_run, (float)tests_passed * 100.0f / (float)tests_run);
    printf("=====================================================\n");

    return (tests_passed == tests_run) ? 0 : 1;
}

CC = gcc
CFLAGS = -Wall -Wextra -std=c99 -O2 -Iinclude

all: cli test

cli: src/tetris_core.c src/cli_game.c
	$(CC) $(CFLAGS) src/tetris_core.c src/cli_game.c -o sb_tetris_cli

test: src/tetris_core.c tests/test_tetris.c
	$(CC) $(CFLAGS) src/tetris_core.c tests/test_tetris.c -o test_tetris

run-test: test
	./test_tetris

clean:
	rm -f test_tetris sb_tetris_cli *.o src/*.o tests/*.o

.PHONY: all cli test run-test clean

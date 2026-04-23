cmake_minimum_required(VERSION 3.22.1)
project(tetris_native C)

# ── NDK native-app-glue (bridges android_main → NativeActivity lifecycle) ──
add_library(native_app_glue STATIC
    ${ANDROID_NDK}/sources/android/native_app_glue/android_native_app_glue.c)
target_include_directories(native_app_glue PUBLIC
    ${ANDROID_NDK}/sources/android/native_app_glue)

# ── Main shared library ──
add_library(tetris_native SHARED
    main.c
    tetris.c
    renderer.c
    input.c
    font.c)

target_include_directories(tetris_native PRIVATE
    ${ANDROID_NDK}/sources/android/native_app_glue
    ${CMAKE_CURRENT_SOURCE_DIR})

# Suppress warnings about unused ANativeActivity_onCreate symbol
target_link_options(tetris_native PRIVATE
    "-u" "ANativeActivity_onCreate")

find_library(log-lib   log)
find_library(android-lib android)
find_library(egl-lib   EGL)
find_library(gles-lib  GLESv2)

target_link_libraries(tetris_native
    native_app_glue
    ${log-lib}
    ${android-lib}
    ${egl-lib}
    ${gles-lib})

# Optimisation flags
target_compile_options(tetris_native PRIVATE
    -O2
    -Wall
    -ffast-math)

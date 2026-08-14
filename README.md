# NAGA-TTRIS // VOID_STACK

> **NAGA-TTRIS (VOID_STACK)** es una implementación de Tetris de alto rendimiento con estética **Digital Brutalista / Cyberpunk**, bordes estrictamente cuadrados, arquitectura modular adaptativa para pantallas verticales (móviles, tablets y monitores verticales), y un **motor dual**: Frontend React (TypeScript) + Motor Nativo en **C (C99)** con juego CLI ANSI y suite de pruebas unitarias automatizadas.

---

## ⚡ Características Principales

### 🎮 Reglas Canónicas de Tetris
- **7-Bag Randomizer**: Algoritmo de barajado Fisher-Yates que garantiza una distribución balanceada de las 7 piezas sin sequías.
- **Super Rotation System (SRS)**: Tablas completas de Wall Kicks y Floor Kicks oficiales para todas las piezas (I, J, L, O, S, T, Z) en rotación horaria (CW) y antihoraria (CCW).
- **[HOLD_MEM]**: Sistema de retención de pieza con visor táctil y restricción estricta de 1 uso por ciclo de caída.
- **[NEXT_MEM]**: Cola visual de próximas 3 piezas en panel industrial.
- **Ghost Piece**: Proyección de caída exacta con contorno cuadrado.
- **Lock Delay (500ms)**: Ventana de bloqueo táctico que se reinicia con maniobras de rotación o desplazamiento (hasta 15 movimientos).
- **Hard Drop & Soft Drop**: Caída instantánea con efecto de pantalla y vibración háptica + caída suave fluida.
- **Sistema Completo de Puntuación**:
  - Puntos por Single, Double, Triple y **Tetris (Quad)**.
  - Detección de **T-Spin** (regla de 3 esquinas) con bonificaciones para Mini, Single, Double y Triple.
  - Multiplicador **Back-to-Back (B2B)** de 1.5x para clears consecutivos de Tetris o T-Spins.
  - Contador y bonificación progresiva por **Combos**.
  - Curva oficial de velocidad por niveles basada en líneas purgadas.

### 🎨 Diseño y Ergonomía
- **100% Bordes Cuadrados**: Sin bordes redondeados (`border-radius: 0 !important`), marcos angulares y soportes `[ ]`.
- **Estética Brutalista**: Paleta de alto contraste (negro, blanco, grises técnicos, alertas rojas), líneas de escaneo CRT y etiquetas de telemetría.
- **Modularidad Vertical**: Adaptación a cualquier relación de aspecto vertical (móviles 9:16, tablets 3:4 y monitores verticales) sin desbordamientos.
- **Sintetizador Web Audio API**: Sonidos retro sintetizados puros en tiempo real (ticks de movimiento, rotación, thump de hard drop, fanfare de Tetris, jingle de level up, alarma de game over y toggle mute).

---

## 🏗️ Estructura del Proyecto

```
naga-ttris/
├── src/
│   ├── audio/
│   │   └── synthAudio.ts        # Motor de audio con Web Audio API
│   ├── components/
│   │   ├── GameBoard.tsx        # Tablero 10x20 con esquinas industriales y ghost piece
│   │   ├── GameOverModal.tsx    # Modal de GameOver con telemetría final
│   │   ├── HoldPanel.tsx        # Panel [HOLD_MEM] con visor cuadrado
│   │   ├── NextQueuePanel.tsx   # Panel [NEXT_MEM] con cola de 3 piezas
│   │   ├── PauseModal.tsx       # Modal de pausa con guía de controles
│   │   ├── ScoreBoard.tsx       # Telemetría en tiempo real y reloj de sistema
│   │   └── TouchControls.tsx    # Controles táctiles ergonómicos con DAS/ARR
│   ├── engine/
│   │   ├── bagRandomizer.ts     # Generador 7-Bag Randomizer
│   │   └── tetrisConstants.ts   # Tablas SRS, matrices de piezas y puntuación
│   ├── types/
│   │   └── tetris.ts            # Definiciones de tipos TypeScript
│   ├── App.tsx                  # Orquestador del ciclo de juego (60 FPS)
│   └── index.css                # Tokens de diseño brutalista y estilos
├── c-engine/
│   ├── include/
│   │   └── tetris_core.h        # Cabecera C99 del motor canónico
│   ├── src/
│   │   ├── tetris_core.c        # Lógica del motor en C (SRS, 7-Bag, Colisiones, Puntuación)
│   │   └── cli_game.c           # Juego en terminal ANSI a 60 FPS con entrada no bloqueante
│   ├── tests/
│   │   └── test_tetris.c        # Suite de 8 tests unitarios automatizados
│   └── Makefile                 # Reglas de compilación y testing en C
├── package.json
└── vite.config.ts
```

---

## 🚀 Guía de Ejecución

### 1. Aplicación Web (React + Vite)
```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo en puerto 3005
npm run dev

# Verificar tipos TypeScript
npm run lint

# Construir para producción
npm run build
```

### 2. Motor en Lenguaje C (C99)
```bash
# Ejecutar la suite de tests unitarios en C
npm run test:c
# O directamente con make:
make -C c-engine run-test

# Compilar el juego jugable para terminal ANSI
make -C c-engine cli

# Jugar en la terminal:
./c-engine/sb_tetris_cli
```

---

## ⌨️ Controles

| Acción | Teclado | Panel Táctil |
| :--- | :--- | :--- |
| **Mover Izquierda** | `◄` / `A` | `◄` |
| **Mover Derecha** | `►` / `D` | `►` |
| **Rotar Horario (CW)** | `▲` / `W` / `X` | `CW ↻` |
| **Rotar Antihorario (CCW)** | `Z` | `↺ CCW` |
| **Caída Suave (Soft Drop)** | `▼` / `S` | `▼ DROP` |
| **Caída Instantánea (Hard Drop)**| `ESPACIO` | `[ INSTANT_GRAVITY ]` |
| **Retener Pieza (Hold)** | `C` / `SHIFT` | `[ HOLD ]` |
| **Pausar / Reanudar** | `P` / `ESC` | `[PAUSE]` |
| **Silenciar Audio** | `M` | `[MUTE]` |

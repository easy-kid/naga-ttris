import React, { useRef, useCallback, useEffect } from 'react';
import { HandlingSettings } from '../types/tetris';

interface TouchControlsProps {
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onSoftDrop: () => void;
  onHardDrop: () => void;
  onRotateCW: () => void;
  onRotateCCW: () => void;
  onRotate180?: () => void;
  onHold: () => void;
  disabled?: boolean;
  settings?: HandlingSettings;
}

// Custom Hook for DAS (Delayed Auto Shift) & ARR (Auto Repeat Rate)
const useHoldAction = (
  action: () => void,
  initialDelay = 135,
  repeatDelay = 33,
  disabled = false,
  vibrate = true
) => {
  const timeoutRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);
  const lastTriggerTimeRef = useRef<number>(0);

  const trigger = useCallback(() => {
    if (disabled) return;
    const now = Date.now();
    // Guard against accidental micro-duplicate triggers
    if (now - lastTriggerTimeRef.current < 25) return;
    lastTriggerTimeRef.current = now;

    if (vibrate && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(8);
      } catch {}
    }
    action();
  }, [action, disabled, vibrate]);

  const start = useCallback(
    (e: React.PointerEvent) => {
      if (e) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
      }
      if (disabled) return;

      // Clean up previous pending timers
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);

      // Trigger exactly once for the tap (1 square movement)
      trigger();

      if (repeatDelay === 0) {
        // Instant 0-ARR (Sonic Auto Shift): Repeat to wall after DAS delay
        timeoutRef.current = setTimeout(() => {
          for (let i = 0; i < 9; i++) action();
        }, initialDelay);
      } else {
        // Standard DAS -> ARR auto-shift interval
        timeoutRef.current = setTimeout(() => {
          intervalRef.current = setInterval(trigger, Math.max(16, repeatDelay));
        }, initialDelay);
      }
    },
    [trigger, initialDelay, repeatDelay, disabled, action]
  );

  const stop = useCallback((e?: React.PointerEvent) => {
    if (e) {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ONLY bind Pointer Events to prevent duplicate touchstart + pointerdown double-firing
  return {
    onPointerDown: start,
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
  };
};

export const TouchControls: React.FC<TouchControlsProps> = ({
  onMoveLeft,
  onMoveRight,
  onSoftDrop,
  onHardDrop,
  onRotateCW,
  onRotateCCW,
  onRotate180,
  onHold,
  disabled = false,
  settings = {
    dasMs: 135,
    arrMs: 33,
    softDropInstant: false,
    vibrateEnabled: true,
    swipeEnabled: true,
  },
}) => {
  const leftHold = useHoldAction(onMoveLeft, settings.dasMs, settings.arrMs, disabled, settings.vibrateEnabled);
  const rightHold = useHoldAction(onMoveRight, settings.dasMs, settings.arrMs, disabled, settings.vibrateEnabled);
  const dropHold = useHoldAction(onSoftDrop, 0, settings.softDropInstant ? 16 : 28, disabled, settings.vibrateEnabled);

  const handleTap = (action: () => void, vibrateMs = 12) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (settings.vibrateEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(vibrateMs);
      } catch {}
    }
    action();
  };

  return (
    <div className="w-full flex-shrink-0 px-2.5 pt-1 pb-2 select-none z-20">
      <div className="metadata flex items-center justify-between px-1 mb-1 text-[8px] text-neutral-400">
        <span>COMMAND_CENTER // TACTILE_MATRIX</span>
        <span>DAS:{settings.dasMs}ms ARR:{settings.arrMs}ms</span>
      </div>

      <div className="grid grid-cols-6 gap-1.5 w-full">
        {/* Row 1: Rotation & Hold Modules */}
        <button
          className="col-span-2 industrial-btn text-xs font-mono font-bold tracking-wider active:bg-white active:!text-black transition-colors py-2 touch-none"
          onPointerDown={handleTap(onHold, 15)}
          disabled={disabled}
        >
          [HOLD]
        </button>

        <button
          className="col-span-2 industrial-btn text-xs font-mono font-bold tracking-wider active:bg-white active:!text-black transition-colors py-2 touch-none"
          onPointerDown={handleTap(onRotateCCW, 10)}
          disabled={disabled}
        >
          ↺ CCW
        </button>

        <button
          className="col-span-2 industrial-btn text-xs font-mono font-bold tracking-wider active:bg-white active:!text-black transition-colors py-2 touch-none"
          onPointerDown={handleTap(onRotateCW, 10)}
          disabled={disabled}
        >
          CW ↻
        </button>

        {/* Row 2: Directional Movement Grid (1 step per single tap) */}
        <button
          className="col-span-2 industrial-btn text-xl font-mono font-black active:bg-white active:!text-black transition-colors py-3 touch-none flex items-center justify-center"
          {...leftHold}
          disabled={disabled}
        >
          ◄
        </button>

        <button
          className="col-span-2 industrial-btn text-xs font-mono font-bold active:bg-white active:!text-black transition-colors py-3 touch-none flex items-center justify-center tracking-wider"
          {...dropHold}
          disabled={disabled}
        >
          ▼ DROP
        </button>

        <button
          className="col-span-2 industrial-btn text-xl font-mono font-black active:bg-white active:!text-black transition-colors py-3 touch-none flex items-center justify-center"
          {...rightHold}
          disabled={disabled}
        >
          ►
        </button>

        {/* Row 3: Instant Gravity (Hard Drop) */}
        <button
          className="col-span-6 industrial-btn !bg-white !text-black active:!bg-black active:!text-white transition-colors flex items-center justify-center font-mono font-black text-xs sm:text-sm tracking-widest py-2.5 shadow-sm touch-none"
          onPointerDown={handleTap(onHardDrop, 25)}
          disabled={disabled}
        >
          [ INSTANT_GRAVITY // HARD DROP ]
        </button>
      </div>
    </div>
  );
};

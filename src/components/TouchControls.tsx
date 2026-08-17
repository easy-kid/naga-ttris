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

  const trigger = useCallback(() => {
    if (disabled) return;
    if (vibrate && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(8);
      } catch {}
    }
    action();
  }, [action, disabled, vibrate]);

  const start = useCallback(
    (e?: React.PointerEvent | React.TouchEvent) => {
      if (e) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
      }
      if (disabled) return;
      trigger();
      clearTimeout(timeoutRef.current);
      clearInterval(intervalRef.current);

      if (repeatDelay === 0) {
        // Instant 0-ARR: Repeat immediately and rapidly
        timeoutRef.current = setTimeout(() => {
          for (let i = 0; i < 9; i++) action();
        }, initialDelay);
      } else {
        timeoutRef.current = setTimeout(() => {
          intervalRef.current = setInterval(trigger, Math.max(16, repeatDelay));
        }, initialDelay);
      }
    },
    [trigger, initialDelay, repeatDelay, disabled, action]
  );

  const stop = useCallback((e?: React.PointerEvent | React.TouchEvent | Event) => {
    if (e) {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
    }
    clearTimeout(timeoutRef.current);
    clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
      clearInterval(intervalRef.current);
    };
  }, []);

  return {
    onPointerDown: start,
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onTouchStart: start,
    onTouchEnd: stop,
    onTouchCancel: stop,
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
    <div className="w-full flex-shrink-0 px-2 pt-1 pb-2 select-none z-20">
      <div className="metadata text-center mb-1 text-[8px] text-neutral-400">
        COMMAND_CENTER // TACTILE_INTERFACE
      </div>

      <div className="grid grid-cols-6 gap-1.5 w-full">
        {/* Row 1: Rotation & Hold */}
        <button
          className="col-span-2 industrial-btn text-xs font-mono font-bold tracking-wider active:bg-white active:!text-black transition-colors"
          onPointerDown={handleTap(onHold, 15)}
          disabled={disabled}
        >
          [HOLD]
        </button>

        <button
          className="col-span-2 industrial-btn text-xs font-mono font-bold tracking-wider active:bg-white active:!text-black transition-colors"
          onPointerDown={handleTap(onRotateCCW, 10)}
          disabled={disabled}
        >
          ↺ CCW
        </button>

        <button
          className="col-span-2 industrial-btn text-xs font-mono font-bold tracking-wider active:bg-white active:!text-black transition-colors"
          onPointerDown={handleTap(onRotateCW, 10)}
          disabled={disabled}
        >
          CW ↻
        </button>

        {/* Row 2: Directional Movement */}
        <button
          className="col-span-2 industrial-btn text-lg sm:text-xl font-mono font-black active:bg-white active:!text-black transition-colors py-2.5"
          {...leftHold}
          style={{ touchAction: 'manipulation' }}
          disabled={disabled}
        >
          ◄
        </button>

        <button
          className="col-span-2 industrial-btn text-xs sm:text-sm font-mono font-bold active:bg-white active:!text-black transition-colors py-2.5"
          {...dropHold}
          style={{ touchAction: 'manipulation' }}
          disabled={disabled}
        >
          ▼ DROP
        </button>

        <button
          className="col-span-2 industrial-btn text-lg sm:text-xl font-mono font-black active:bg-white active:!text-black transition-colors py-2.5"
          {...rightHold}
          style={{ touchAction: 'manipulation' }}
          disabled={disabled}
        >
          ►
        </button>

        {/* Row 3: Instant Gravity (Hard Drop) */}
        <button
          className="col-span-6 industrial-btn !bg-white !text-black active:!bg-black active:!text-white transition-colors flex items-center justify-center font-mono font-black text-xs sm:text-sm tracking-widest py-2.5 shadow-sm"
          onPointerDown={handleTap(onHardDrop, 25)}
          disabled={disabled}
        >
          [ INSTANT_GRAVITY // HARD DROP ]
        </button>
      </div>
    </div>
  );
};

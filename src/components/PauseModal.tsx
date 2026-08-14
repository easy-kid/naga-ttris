import React from 'react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4 select-none font-mono animate-fadeIn">
      <div className="w-full max-w-xs border-2 border-white bg-black p-4 flex flex-col items-center text-center relative">
        {/* Corner Accents */}
        <div className="corner corner-tl z-20"></div>
        <div className="corner corner-tr z-20"></div>
        <div className="corner corner-bl z-20"></div>
        <div className="corner corner-br z-20"></div>

        {/* Title */}
        <span className="text-white font-black tracking-widest text-sm uppercase mb-1 border-b border-white pb-1 w-full">
          [ SYSTEM_PAUSED ]
        </span>
        <span className="metadata text-[8px] my-1">// CORE_EXECUTION_SUSPENDED //</span>

        {/* Control Cheat Sheet */}
        <div className="w-full my-3 border border-white/30 bg-neutral-950 p-2 text-[9px] text-left space-y-1">
          <div className="text-neutral-400 font-bold border-b border-white/20 pb-0.5 mb-1">
            KEYBOARD_BINDINGS:
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">MOVE:</span>
            <span className="text-white font-bold">◄ ► / A D</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">ROTATE CW:</span>
            <span className="text-white font-bold">▲ / W / X</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">ROTATE CCW:</span>
            <span className="text-white font-bold">Z</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">SOFT DROP:</span>
            <span className="text-white font-bold">▼ / S</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">HARD DROP:</span>
            <span className="text-white font-bold">SPACE</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">HOLD PIECE:</span>
            <span className="text-white font-bold">C / SHIFT</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">PAUSE/MUTE:</span>
            <span className="text-white font-bold">P, ESC / M</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="w-full space-y-2">
          <button
            onClick={onResume}
            className="w-full industrial-btn bg-white !text-black hover:bg-neutral-200 active:translate-y-0.5 text-xs font-black tracking-widest py-2.5 uppercase"
          >
            [ RESUME_EXECUTION ]
          </button>

          <button
            onClick={onToggleMute}
            className="w-full industrial-btn hover:bg-neutral-900 active:translate-y-0.5 text-xs font-bold tracking-wider py-2 uppercase"
          >
            AUDIO: {isMuted ? 'MUTED [OFF]' : 'ACTIVE [ON]'}
          </button>

          <button
            onClick={onRestart}
            className="w-full industrial-btn border-red-500 text-red-500 hover:bg-red-950/30 active:translate-y-0.5 text-xs font-bold tracking-wider py-2 uppercase"
          >
            [ ABORT // REBOOT_GAME ]
          </button>
        </div>
      </div>
    </div>
  );
};

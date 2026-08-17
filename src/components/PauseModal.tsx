import React from 'react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenSettings?: () => void;
  onReturnToMenu?: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  isMuted,
  onToggleMute,
  onOpenSettings,
  onReturnToMenu,
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
        <div className="w-full my-2.5 border border-white/30 bg-neutral-950 p-2 text-[9px] text-left space-y-1">
          <div className="text-neutral-400 font-bold border-b border-neutral-800 pb-0.5 mb-1">
            KEYBOARD_BINDINGS:
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">MOVE:</span>
            <span className="text-white font-bold">◄ ► / A D</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">ROTATE CW / CCW:</span>
            <span className="text-white font-bold">▲ X / Z</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">SOFT / HARD DROP:</span>
            <span className="text-white font-bold">▼ / SPACE</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">HOLD PIECE:</span>
            <span className="text-white font-bold">C / SHIFT</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="w-full space-y-1.5">
          <button
            onClick={onResume}
            className="w-full industrial-btn !bg-white !text-black hover:bg-neutral-200 active:scale-[0.99] text-xs font-black tracking-widest py-2.5 uppercase"
          >
            [ RESUME_EXECUTION ]
          </button>

          {onOpenSettings && (
            <button
              onClick={() => {
                onResume();
                onOpenSettings();
              }}
              className="w-full industrial-btn border border-white hover:bg-neutral-900 active:scale-[0.99] text-xs font-bold tracking-wider py-1.5 uppercase"
            >
              [ CONFIG & HANDLING ]
            </button>
          )}

          <button
            onClick={onRestart}
            className="w-full industrial-btn border border-white hover:bg-neutral-900 active:scale-[0.99] text-xs font-bold tracking-wider py-1.5 uppercase text-neutral-300"
          >
            [ REBOOT_ROUND ]
          </button>

          {onReturnToMenu && (
            <button
              onClick={onReturnToMenu}
              className="w-full industrial-btn border border-neutral-700 bg-neutral-950 hover:border-white active:scale-[0.99] text-xs font-bold tracking-wider py-1.5 uppercase text-neutral-400 hover:text-white"
            >
              [ RETURN_TO_MAIN_MENU ]
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

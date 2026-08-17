import React from 'react';
import { GameMode, HandlingSettings } from '../types/tetris';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  settings: HandlingSettings;
  onUpdateSettings: (newSettings: HandlingSettings) => void;
  bestSprintMs?: number;
  bestBlitzScore?: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentMode,
  onSelectMode,
  settings,
  onUpdateSettings,
  bestSprintMs,
  bestBlitzScore,
}) => {
  if (!isOpen) return null;

  const formatSprintTime = (ms?: number) => {
    if (!ms || ms <= 0) return '--:--.---';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const millis = ms % 1000;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-sm border-2 border-white bg-black p-4 flex flex-col gap-4 font-mono text-white relative shadow-[0_0_20px_rgba(255,255,255,0.15)]">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
          <div className="flex flex-col">
            <span className="text-xs font-black tracking-widest text-white uppercase">
              // SYSTEM_CONFIG & MODES
            </span>
            <span className="metadata text-[7px] text-neutral-400">
              PRO_TETRIS_TUNING
            </span>
          </div>
          <button
            onClick={onClose}
            className="border border-white/60 hover:border-white px-2 py-0.5 text-xs font-bold active:bg-white active:text-black"
          >
            [X]
          </button>
        </div>

        {/* Mode Selection Grid */}
        <div className="flex flex-col gap-1.5">
          <span className="metadata text-[8px] text-neutral-300">
            ACTIVE_GAME_MODE:
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => { onSelectMode('MARATHON'); onClose(); }}
              className={`p-2 text-left border ${
                currentMode === 'MARATHON'
                  ? 'border-white bg-white text-black font-black'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-500'
              }`}
            >
              <div className="text-[11px] font-bold">1. MARATHON</div>
              <div className="text-[7px] opacity-80">150 Lines / Endless</div>
            </button>

            <button
              onClick={() => { onSelectMode('SPRINT'); onClose(); }}
              className={`p-2 text-left border ${
                currentMode === 'SPRINT'
                  ? 'border-white bg-white text-black font-black'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-500'
              }`}
            >
              <div className="text-[11px] font-bold">2. 40L SPRINT</div>
              <div className="text-[7px] opacity-80">PB: {formatSprintTime(bestSprintMs)}</div>
            </button>

            <button
              onClick={() => { onSelectMode('BLITZ'); onClose(); }}
              className={`p-2 text-left border ${
                currentMode === 'BLITZ'
                  ? 'border-white bg-white text-black font-black'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-500'
              }`}
            >
              <div className="text-[11px] font-bold">3. BLITZ (2M)</div>
              <div className="text-[7px] opacity-80">HI: {bestBlitzScore || 0} PTS</div>
            </button>

            <button
              onClick={() => { onSelectMode('ZEN'); onClose(); }}
              className={`p-2 text-left border ${
                currentMode === 'ZEN'
                  ? 'border-white bg-white text-black font-black'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-500'
              }`}
            >
              <div className="text-[11px] font-bold">4. ZEN MODE</div>
              <div className="text-[7px] opacity-80">No Top-Out Sandbox</div>
            </button>
          </div>
        </div>

        {/* Handling Controls (DAS / ARR) */}
        <div className="flex flex-col gap-3 border-t border-neutral-800 pt-3">
          <span className="metadata text-[8px] text-neutral-300">
            PRO_HANDLING (DAS / ARR TUNING):
          </span>

          {/* DAS Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[9px]">
              <span>DAS (Initial Delay):</span>
              <span className="font-bold">{settings.dasMs} ms</span>
            </div>
            <input
              type="range"
              min="80"
              max="220"
              step="5"
              value={settings.dasMs}
              onChange={(e) =>
                onUpdateSettings({ ...settings, dasMs: Number(e.target.value) })
              }
              className="w-full accent-white cursor-pointer"
            />
          </div>

          {/* ARR Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[9px]">
              <span>ARR (Repeat Rate):</span>
              <span className="font-bold">{settings.arrMs === 0 ? '0 ms (INSTANT)' : `${settings.arrMs} ms`}</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="2"
              value={settings.arrMs}
              onChange={(e) =>
                onUpdateSettings({ ...settings, arrMs: Number(e.target.value) })
              }
              className="w-full accent-white cursor-pointer"
            />
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-2 text-[9px] pt-1">
            <label className="flex items-center gap-2 cursor-pointer border border-neutral-800 p-1.5 hover:border-neutral-600">
              <input
                type="checkbox"
                checked={settings.softDropInstant}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, softDropInstant: e.target.checked })
                }
                className="accent-white"
              />
              <span>SONIC DROP</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer border border-neutral-800 p-1.5 hover:border-neutral-600">
              <input
                type="checkbox"
                checked={settings.vibrateEnabled}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, vibrateEnabled: e.target.checked })
                }
                className="accent-white"
              />
              <span>HAPTICS</span>
            </label>
          </div>
        </div>

        {/* Footer actions */}
        <button
          onClick={onClose}
          className="w-full industrial-btn !bg-white !text-black font-black text-xs py-2 tracking-widest uppercase hover:opacity-90 active:scale-[0.99]"
        >
          [ APPLY & RESUME ]
        </button>
      </div>
    </div>
  );
};

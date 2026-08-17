import React from 'react';
import { CareerStats } from '../types/tetris';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  careerStats: CareerStats;
  onResetStats: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  careerStats,
  onResetStats,
}) => {
  if (!isOpen) return null;

  const formatSprintTime = (ms: number) => {
    if (!ms || ms <= 0) return '--:--.---';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const millis = ms % 1000;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none font-mono">
      <div className="w-full max-w-sm border-2 border-white bg-black p-4 flex flex-col gap-4 text-white relative shadow-[0_0_25px_rgba(255,255,255,0.2)]">
        {/* Corner Accents */}
        <div className="corner corner-tl z-20"></div>
        <div className="corner corner-tr z-20"></div>
        <div className="corner corner-bl z-20"></div>
        <div className="corner corner-br z-20"></div>

        {/* Header */}
        <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
          <div className="flex flex-col">
            <span className="text-xs font-black tracking-widest text-white uppercase">
              // CAREER_TELEMETRY_LOGS
            </span>
            <span className="metadata text-[7px] text-neutral-400">
              HISTORICAL_PLAYER_DATABASE
            </span>
          </div>
          <button
            onClick={onClose}
            className="border border-white/60 hover:border-white px-2 py-0.5 text-xs font-bold active:bg-white active:text-black"
          >
            [X]
          </button>
        </div>

        {/* Stats Grid */}
        <div className="w-full space-y-2 text-xs">
          {/* Records Row */}
          <div className="border border-neutral-800 bg-neutral-950 p-2.5 space-y-1.5">
            <div className="text-[9px] text-neutral-400 font-bold tracking-wider border-b border-neutral-800 pb-0.5">
              PERSONAL_RECORDS:
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">MARATHON_HI:</span>
              <span className="font-bold text-white tracking-wider">
                {String(careerStats.marathonHighScore).padStart(6, '0')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">40L_SPRINT_PB:</span>
              <span className="font-bold text-white tracking-wider">
                {formatSprintTime(careerStats.bestSprintMs)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">BLITZ_2M_HI:</span>
              <span className="font-bold text-white tracking-wider">
                {String(careerStats.bestBlitzScore).padStart(6, '0')} PTS
              </span>
            </div>
          </div>

          {/* Historical Totals */}
          <div className="border border-neutral-800 bg-neutral-950 p-2.5 space-y-1.5">
            <div className="text-[9px] text-neutral-400 font-bold tracking-wider border-b border-neutral-800 pb-0.5">
              CUMULATIVE_TOTALS:
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">GAMES_LAUNCHED:</span>
              <span className="font-bold text-white">{careerStats.gamesPlayed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">LINES_PURGED:</span>
              <span className="font-bold text-white">{careerStats.totalLines}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">PIECES_PLACED:</span>
              <span className="font-bold text-white">{careerStats.totalPiecesPlaced}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">QUAD_TETRISES:</span>
              <span className="font-bold text-white">{careerStats.totalTetrises}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">T_SPIN_EXECUTIONS:</span>
              <span className="font-bold text-white">{careerStats.totalTSpins}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">PERFECT_CLEARS:</span>
              <span className="font-bold text-white">{careerStats.totalPerfectClears}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">MAX_COMBO_STREAK:</span>
              <span className="font-bold text-white">x{careerStats.maxComboEver}</span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-1.5 pt-1">
          <button
            onClick={onClose}
            className="w-full industrial-btn !bg-white !text-black font-black text-xs py-2 uppercase tracking-widest active:scale-[0.99]"
          >
            [ CLOSE_LOGS ]
          </button>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to reset all career records and telemetry?')) {
                onResetStats();
              }
            }}
            className="text-[9px] text-neutral-500 hover:text-neutral-300 underline py-0.5 text-center"
          >
            PURGE_ALL_RECORDS()
          </button>
        </div>
      </div>
    </div>
  );
};

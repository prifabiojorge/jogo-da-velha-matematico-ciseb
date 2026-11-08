/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Delete, CheckCircle2, RotateCcw } from 'lucide-react';
import { audioService } from '../services/audioService';

interface KeypadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export const Keypad: React.FC<KeypadProps> = ({
  onDigit,
  onBackspace,
  onClear,
  onSubmit,
  disabled = false,
}) => {
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  const handleDigit = (d: string) => {
    if (disabled) return;
    audioService.playClick();
    onDigit(d);
  };

  const handleBackspace = () => {
    if (disabled) return;
    audioService.playClick();
    onBackspace();
  };

  const handleClear = () => {
    if (disabled) return;
    audioService.playClick();
    onClear();
  };

  const handleSubmit = () => {
    if (disabled) return;
    audioService.playClick();
    onSubmit();
  };

  return (
    <div className="w-full max-w-xs mx-auto space-y-2 select-none">
      {/* 3x3 Digit Grid */}
      <div className="grid grid-cols-3 gap-2">
        {digits.map((d) => (
          <button
            key={d}
            type="button"
            disabled={disabled}
            onClick={() => handleDigit(d)}
            className="h-14 sm:h-16 rounded-xl bg-slate-800/90 hover:bg-sky-600 active:bg-sky-700 text-white font-bold text-2xl border border-slate-700 hover:border-sky-400 shadow-md transition-all duration-150 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-heading"
          >
            {d}
          </button>
        ))}
      </div>

      {/* Bottom Row: Clear, 0, Backspace */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={handleClear}
          className="h-14 sm:h-16 rounded-xl bg-rose-950/80 hover:bg-rose-900 active:bg-rose-800 text-rose-200 font-bold text-sm border border-rose-800/60 shadow-md transition-all duration-150 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-0.5"
          title="Limpar digitação"
        >
          <RotateCcw className="w-4 h-4 text-rose-300" />
          <span>Limpar</span>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => handleDigit('0')}
          className="h-14 sm:h-16 rounded-xl bg-slate-800/90 hover:bg-sky-600 active:bg-sky-700 text-white font-bold text-2xl border border-slate-700 hover:border-sky-400 shadow-md transition-all duration-150 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-heading"
        >
          0
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={handleBackspace}
          className="h-14 sm:h-16 rounded-xl bg-amber-950/80 hover:bg-amber-900 active:bg-amber-800 text-amber-200 font-bold text-sm border border-amber-800/60 shadow-md transition-all duration-150 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-0.5"
          title="Apagar último número"
        >
          <Delete className="w-4 h-4 text-amber-300" />
          <span>Apagar</span>
        </button>
      </div>

      {/* Primary Submit Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleSubmit}
        className="w-full h-14 sm:h-16 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:from-emerald-700 active:to-teal-700 text-white font-extrabold text-xl border border-emerald-400/50 shadow-lg shadow-emerald-950/40 transition-all duration-150 transform active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-heading tracking-wide"
      >
        <CheckCircle2 className="w-6 h-6 text-white" />
        <span>CONFIRMAR (ENTER)</span>
      </button>
    </div>
  );
};

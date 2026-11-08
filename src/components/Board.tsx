/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Cell, Mark } from '../shared/types';
import { Sparkles } from 'lucide-react';

interface BoardProps {
  board: Cell[];
  winningLine: [number, number, number] | null;
  activeMark: Mark;
  isMyTurn: boolean;
  onSelectCell: (index: number) => void;
  disabled?: boolean;
}

export const Board: React.FC<BoardProps> = ({
  board,
  winningLine,
  activeMark,
  isMyTurn,
  onSelectCell,
  disabled = false,
}) => {
  const isWinningCell = (index: number) => {
    return winningLine ? winningLine.includes(index) : false;
  };

  return (
    <div className="w-full max-w-md mx-auto aspect-square p-3 sm:p-4 bg-slate-900/90 border-2 border-sky-500/40 rounded-3xl shadow-2xl backdrop-blur-xl relative select-none">
      
      {/* Background Decorative Grid Accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-transparent to-blue-600/10 rounded-3xl pointer-events-none" />

      {/* 3x3 Grid Matrix */}
      <div className="grid grid-cols-3 grid-rows-3 gap-3 w-full h-full">
        {board.map((cell, index) => {
          const isWin = isWinningCell(index);
          const row = Math.floor(index / 3) + 1;
          const col = (index % 3) + 1;

          return (
            <button
              key={index}
              type="button"
              disabled={disabled || !isMyTurn || cell !== null}
              onClick={() => onSelectCell(index)}
              aria-label={`Linha ${row}, Coluna ${col}: ${cell ? `Marcada com ${cell}` : 'Vazia, clique para desafiar'}`}
              className={`relative rounded-2xl flex items-center justify-center font-black transition-all duration-200 transform ${
                cell === null && isMyTurn && !disabled
                  ? 'bg-slate-800/80 hover:bg-sky-900/50 hover:border-sky-400 border-2 border-slate-700/80 hover:scale-105 active:scale-95 shadow-md cursor-pointer group'
                  : cell === null
                  ? 'bg-slate-800/40 border-2 border-slate-800 cursor-not-allowed opacity-75'
                  : isWin
                  ? 'bg-amber-950/90 border-4 border-amber-400 shadow-xl shadow-amber-500/30 scale-105 animate-pulse'
                  : cell === 'X'
                  ? 'bg-sky-950/80 border-2 border-sky-500/80 shadow-lg shadow-sky-500/20'
                  : 'bg-orange-950/80 border-2 border-orange-500/80 shadow-lg shadow-orange-500/20'
              }`}
            >
              {/* Empty Cell Hover Icon */}
              {cell === null && isMyTurn && !disabled && (
                <span className="opacity-0 group-hover:opacity-40 font-heading text-3xl font-extrabold text-sky-300 transition-opacity">
                  {activeMark}
                </span>
              )}

              {/* Symbol X */}
              {cell === 'X' && (
                <div className="relative flex items-center justify-center animate-scale-up">
                  <span className="font-heading text-5xl sm:text-6xl font-black text-sky-400 drop-shadow-[0_0_15px_rgba(56,189,248,0.8)] tracking-tight">
                    X
                  </span>
                  {isWin && (
                    <Sparkles className="w-5 h-5 text-amber-300 absolute -top-2 -right-2 animate-bounce" />
                  )}
                </div>
              )}

              {/* Symbol O */}
              {cell === 'O' && (
                <div className="relative flex items-center justify-center animate-scale-up">
                  <span className="font-heading text-5xl sm:text-6xl font-black text-orange-400 drop-shadow-[0_0_15px_rgba(251,146,60,0.8)] tracking-tight">
                    O
                  </span>
                  {isWin && (
                    <Sparkles className="w-5 h-5 text-amber-300 absolute -top-2 -right-2 animate-bounce" />
                  )}
                </div>
              )}

            </button>
          );
        })}
      </div>
    </div>
  );
};

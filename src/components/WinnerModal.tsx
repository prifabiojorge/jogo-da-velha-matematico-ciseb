/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Play, Sparkles } from 'lucide-react';
import { Mark } from '../shared/types';
import { audioService } from '../services/audioService';

interface WinnerModalProps {
  winnerMark: Mark;
  winnerName: string;
  onNextRound: () => void;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({
  winnerMark,
  winnerName,
  onNextRound,
}) => {
  useEffect(() => {
    // Fire celebratory confetti explosion
    audioService.playVictory();

    const duration = 2.5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#00A3E0', '#38BDF8', '#F59E0B', '#10B981'],
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#00A3E0', '#38BDF8', '#F59E0B', '#10B981'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, [winnerMark]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-[#0b2247] border-2 border-amber-400 rounded-3xl shadow-2xl p-6 sm:p-8 text-center text-white space-y-6 relative overflow-hidden">
        
        {/* Glowing background highlights */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-sky-400/20 rounded-full blur-3xl pointer-events-none" />

        {/* Trophy Icon Header */}
        <div className="relative inline-block">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/30 animate-bounce">
            <Trophy className="w-10 h-10 text-slate-950" />
          </div>
          <Sparkles className="w-6 h-6 text-amber-300 absolute -top-2 -right-2 animate-pulse" />
        </div>

        {/* Title & Details */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-amber-300 uppercase tracking-widest">
            ¡VICTÓRIA NO JOGO DA VELHA!
          </p>
          <h2 className="text-3xl sm:text-4xl font-black font-heading text-white">
            {winnerName} VENCEU!
          </h2>
          <p className="text-sm text-sky-200">
            Conquistou a trinca de <strong className="text-amber-300 font-extrabold">{winnerMark}</strong> no tabuleiro!
          </p>
        </div>

        {/* Winner Badge */}
        <div className="bg-slate-900/90 border border-amber-400/40 rounded-2xl p-4 flex items-center justify-center gap-4 shadow-inner">
          <span
            className={`w-14 h-14 rounded-xl flex items-center justify-center font-black text-3xl font-heading shadow-lg ${
              winnerMark === 'X'
                ? 'bg-sky-500 text-slate-950 shadow-sky-500/30'
                : 'bg-orange-500 text-slate-950 shadow-orange-500/30'
            }`}
          >
            {winnerMark}
          </span>
          <div className="text-left">
            <span className="text-xs text-slate-400 font-semibold block">CAMPEÃO DA RODADA</span>
            <span className="text-lg font-bold text-white">{winnerName}</span>
          </div>
        </div>

        {/* Next Round CTA Button */}
        <button
          type="button"
          onClick={onNextRound}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-sky-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-lg border border-sky-300/40 shadow-xl shadow-sky-950/50 transition-all duration-150 transform hover:scale-102 active:scale-98 flex items-center justify-center gap-2 font-heading tracking-wide"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>INICIAR PRÓXIMA RODADA</span>
        </button>

      </div>
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { RefreshCw, Info } from 'lucide-react';
import { audioService } from '../services/audioService';

interface DrawBannerProps {
  onRestart: () => void;
}

export const DrawBanner: React.FC<DrawBannerProps> = ({ onRestart }) => {
  const [seconds, setSeconds] = useState<number>(3);
  const restartRef = useRef(onRestart);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    restartRef.current = onRestart;
  }, [onRestart]);

  useEffect(() => {
    audioService.playDraw();
    hasTriggeredRef.current = false;

    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!hasTriggeredRef.current) {
            hasTriggeredRef.current = true;
            restartRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-[#0b2247] border-2 border-sky-400 rounded-3xl shadow-2xl p-6 sm:p-8 text-center text-white space-y-6 relative overflow-hidden">
        
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center mx-auto shadow-lg shadow-sky-500/30">
          <RefreshCw className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '3s' }} />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-sky-300 uppercase tracking-widest">
            EMPATE NO TABULEIRO
          </p>
          <h2 className="text-3xl font-black font-heading text-white">
            DEU VELHA!
          </h2>
          <p className="text-sm text-slate-300">
            Nenhum jogador conseguiu a trinca nesta rodada.
          </p>
        </div>

        {/* Auto restart banner indicator */}
        <div className="bg-slate-900/90 border border-sky-400/40 rounded-2xl p-4 flex items-center justify-center gap-3 shadow-inner">
          <Info className="w-5 h-5 text-sky-400 shrink-0" />
          <p className="text-sm font-semibold text-sky-200">
            Reiniciando o tabuleiro automaticamente em{' '}
            <strong className="text-amber-300 font-extrabold text-xl font-mono">{seconds}s</strong>
          </p>
        </div>

      </div>
    </div>
  );
};

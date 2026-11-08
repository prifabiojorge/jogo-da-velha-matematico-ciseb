/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Volume2, VolumeX, RotateCcw, Home, Monitor, Wifi } from 'lucide-react';
import { audioService } from '../services/audioService';
import { GameMode } from '../shared/types';

interface HeaderProps {
  mode: GameMode;
  roomCode?: string;
  isMuted: boolean;
  onToggleMute: () => void;
  onResetGame: () => void;
  onGoHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  roomCode,
  isMuted,
  onToggleMute,
  onResetGame,
  onGoHome,
}) => {
  return (
    <header className="w-full bg-[#003B7A] border-b border-sky-500/30 shadow-lg text-white sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        
        {/* Zone 1: CISEB Brand & Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <img
            src="/assets/aistudio/logo_branco_e_azul_s__CISEB_2c6f4569.png"
            alt="Logo CISEB - Centro de Inovação e Sustentabilidade da Educação Básica"
            className="h-10 md:h-12 w-auto object-contain drop-shadow"
          />
          <div className="hidden sm:block border-l border-sky-400/30 pl-3">
            <h1 className="text-base md:text-lg font-extrabold tracking-tight font-heading text-white leading-tight">
              Jogo da Velha Matemático
            </h1>
            <p className="text-xs text-sky-200 font-medium">
              Centro de Inovação e Sustentabilidade da Educação Básica
            </p>
          </div>
        </div>

        {/* Zone 2: Mode & Room Indicator */}
        <div className="flex items-center gap-2 bg-slate-900/40 border border-sky-400/30 px-3 py-1.5 rounded-full text-xs md:text-sm font-semibold text-sky-100 shrink-0">
          {mode === 'LOCAL' ? (
            <>
              <Monitor className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Modo: 1 Chromebook (Local)</span>
            </>
          ) : (
            <>
              <Wifi className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
              <span>Sala Online:</span>
              <span className="font-mono text-amber-300 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40 tracking-wider">
                {roomCode || '----'}
              </span>
            </>
          )}
        </div>

        {/* Zone 3: Interactive Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleMute}
            className={`p-2 rounded-lg border transition-all duration-200 flex items-center gap-1.5 text-xs font-semibold ${
              isMuted
                ? 'bg-rose-950/60 border-rose-500/50 text-rose-200 hover:bg-rose-900/80'
                : 'bg-sky-900/50 border-sky-400/40 text-sky-100 hover:bg-sky-800/80'
            }`}
            title={isMuted ? 'Ativar Som' : 'Desativar Som'}
            aria-label={isMuted ? 'Ativar som do jogo' : 'Desativar som do jogo'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-sky-300" />}
            <span className="hidden md:inline">{isMuted ? 'Sem Som' : 'Com Som'}</span>
          </button>

          <button
            onClick={onResetGame}
            className="p-2 rounded-lg bg-sky-900/50 border border-sky-400/40 text-sky-100 hover:bg-sky-800/80 transition-all text-xs font-semibold flex items-center gap-1.5"
            title="Reiniciar Tabuleiro"
          >
            <RotateCcw className="w-4 h-4 text-sky-300" />
            <span className="hidden md:inline">Reiniciar</span>
          </button>

          <button
            onClick={onGoHome}
            className="p-2 rounded-lg bg-slate-800/60 border border-slate-600/50 text-slate-200 hover:bg-slate-700/80 transition-all text-xs font-semibold flex items-center gap-1.5"
            title="Mudar Modo / Início"
          >
            <Home className="w-4 h-4 text-slate-300" />
            <span className="hidden md:inline">Início</span>
          </button>
        </div>

      </div>
    </header>
  );
};

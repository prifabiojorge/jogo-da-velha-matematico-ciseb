/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PlayerInfo, PlayerId } from '../shared/types';
import { Trophy, UserCheck, Clock } from 'lucide-react';

interface ScoreboardProps {
  player1: PlayerInfo;
  player2: PlayerInfo;
  currentPlayer: PlayerId;
  myPlayerId: PlayerId;
  roundNumber: number;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({
  player1,
  player2,
  currentPlayer,
  myPlayerId,
  roundNumber,
}) => {
  const isP1Turn = currentPlayer === 'P1';
  const isP2Turn = currentPlayer === 'P2';

  const isMyTurn = currentPlayer === myPlayerId;

  return (
    <div className="w-full max-w-xl mx-auto space-y-3">
      {/* Turn Banner */}
      <div
        className={`w-full py-3 px-4 rounded-2xl border flex items-center justify-between shadow-lg transition-all duration-300 ${
          isMyTurn
            ? 'bg-gradient-to-r from-sky-950/90 via-sky-900/90 to-blue-950/90 border-sky-400/60 shadow-sky-500/20 text-sky-100'
            : 'bg-slate-900/80 border-slate-700/60 text-slate-300'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              isMyTurn ? 'bg-sky-400 animate-ping' : 'bg-amber-400'
            }`}
          />
          <div>
            <p className="text-xs text-sky-200 uppercase font-semibold tracking-wider">
              Rodada #{roundNumber}
            </p>
            <h3 className="text-base font-extrabold font-heading text-white">
              {isMyTurn ? 'SUA VEZ! Escolha uma casa para resolver a adição' : 'Vez do Adversário! Aguarde a jogada...'}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-bold bg-slate-950/60 px-3 py-1.5 rounded-xl border border-sky-500/20 text-sky-300">
          <Clock className="w-3.5 h-3.5 text-sky-400" />
          <span>5 Segundos</span>
        </div>
      </div>

      {/* Players Cards & Cumulative Score */}
      <div className="grid grid-cols-2 gap-3">
        {/* Player 1 Card */}
        <div
          className={`p-3.5 rounded-2xl border transition-all duration-200 relative overflow-hidden flex items-center justify-between ${
            isP1Turn
              ? 'bg-slate-800/90 border-sky-400 shadow-md shadow-sky-500/10 ring-2 ring-sky-400/30'
              : 'bg-slate-900/70 border-slate-800 opacity-90'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl font-heading shadow ${
                player1.mark === 'X'
                  ? 'bg-sky-500 text-slate-950 shadow-sky-500/30'
                  : 'bg-orange-500 text-slate-950 shadow-orange-500/30'
              }`}
            >
              {player1.mark}
            </span>
            <div>
              <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                {player1.id === myPlayerId && (
                  <span className="text-[10px] bg-sky-950 text-sky-300 font-bold px-1.5 py-0.2 rounded border border-sky-700">
                    Você
                  </span>
                )}
                <span>{player1.name}</span>
              </p>
              <p className="text-xs font-semibold text-slate-300">
                Símbolo: <strong className="text-white">{player1.mark}</strong>
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black font-heading text-amber-400 tabular-nums block leading-none">
              {player1.score}
            </span>
            <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">PONTOS</span>
          </div>
        </div>

        {/* Player 2 Card */}
        <div
          className={`p-3.5 rounded-2xl border transition-all duration-200 relative overflow-hidden flex items-center justify-between ${
            isP2Turn
              ? 'bg-slate-800/90 border-sky-400 shadow-md shadow-sky-500/10 ring-2 ring-sky-400/30'
              : 'bg-slate-900/70 border-slate-800 opacity-90'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl font-heading shadow ${
                player2.mark === 'X'
                  ? 'bg-sky-500 text-slate-950 shadow-sky-500/30'
                  : 'bg-orange-500 text-slate-950 shadow-orange-500/30'
              }`}
            >
              {player2.mark}
            </span>
            <div>
              <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                {player2.id === myPlayerId && (
                  <span className="text-[10px] bg-sky-950 text-sky-300 font-bold px-1.5 py-0.2 rounded border border-sky-700">
                    Você
                  </span>
                )}
                <span>{player2.name}</span>
              </p>
              <p className="text-xs font-semibold text-slate-300">
                Símbolo: <strong className="text-white">{player2.mark}</strong>
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black font-heading text-amber-400 tabular-nums block leading-none">
              {player2.score}
            </span>
            <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">PONTOS</span>
          </div>
        </div>
      </div>

    </div>
  );
};

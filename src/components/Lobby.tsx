/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Monitor, Wifi, Play, Plus, ArrowRight, Copy, Check, Sparkles, BookOpen, Loader2, ArrowLeft } from 'lucide-react';
import { GameMode, Mark } from '../shared/types';
import { audioService } from '../services/audioService';

interface LobbyProps {
  onStartLocal: (p1Mark: Mark) => void;
  onCreateOnlineRoom: (p1Mark: Mark) => void;
  onJoinOnlineRoom: (roomCode: string) => void;
  createdRoomCode?: string | null;
  isWaitingForPlayer?: boolean;
  onCancelWaiting?: () => void;
  error?: string | null;
}

export const Lobby: React.FC<LobbyProps> = ({
  onStartLocal,
  onCreateOnlineRoom,
  onJoinOnlineRoom,
  createdRoomCode,
  isWaitingForPlayer = false,
  onCancelWaiting,
  error,
}) => {
  const [selectedMode, setSelectedMode] = useState<GameMode>('LOCAL');
  const [p1Mark, setP1Mark] = useState<Mark>('X');
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');
  const [onlineTab, setOnlineTab] = useState<'CREATE' | 'JOIN'>('CREATE');
  const [copied, setCopied] = useState<boolean>(false);

  const handleStartLocalGame = () => {
    audioService.playClick();
    onStartLocal(p1Mark);
  };

  const handleCreateRoom = () => {
    audioService.playClick();
    onCreateOnlineRoom(p1Mark);
  };

  const handleJoinRoom = () => {
    if (!roomCodeInput.trim() || roomCodeInput.length !== 4) return;
    audioService.playClick();
    onJoinOnlineRoom(roomCodeInput.trim());
  };

  const handleCopyCode = () => {
    if (createdRoomCode) {
      navigator.clipboard.writeText(createdRoomCode);
      setCopied(true);
      audioService.playClick();
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // If Player 1 is waiting for Player 2 to join
  if (isWaitingForPlayer && createdRoomCode) {
    return (
      <div className="w-full max-w-lg mx-auto space-y-6 animate-fade-in p-4 sm:p-6">
        <div className="bg-[#0b2247] border-2 border-sky-400 rounded-3xl p-6 sm:p-8 text-center text-white space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Logo CISEB */}
          <div className="flex justify-center">
            <img
              src="/assets/aistudio/logo_branco_e_azul_s__CISEB_2c6f4569.png"
              alt="Logo CISEB"
              className="h-14 sm:h-16 w-auto object-contain drop-shadow"
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold text-sky-300 uppercase tracking-widest">
              SALA ONLINE CRIADA COM SUCESSO!
            </p>
            <h2 className="text-2xl font-black font-heading text-white">
              Aguardando Aluno 2...
            </h2>
            <p className="text-xs text-slate-300">
              Passe o código abaixo para o seu colega no outro Chromebook:
            </p>
          </div>

          {/* Huge 4-Digit Room Code Badge */}
          <div className="bg-slate-950 border-2 border-amber-400/80 rounded-2xl p-6 shadow-inner space-y-3 relative group">
            <span className="text-5xl sm:text-6xl font-black font-mono tracking-widest text-amber-300 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]">
              {createdRoomCode}
            </span>
            <div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-2 py-2 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 font-bold text-xs transition-all active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">Código Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-amber-300" />
                    <span>Copiar Código</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Pulsing Status Bar */}
          <div className="bg-slate-900/90 border border-sky-500/30 rounded-2xl p-4 flex items-center justify-center gap-3 text-sky-200 text-xs font-semibold">
            <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />
            <span>Aguardando o Aluno 2 digitar o código <strong className="text-amber-300 font-mono">{createdRoomCode}</strong> no outro Chromebook...</span>
          </div>

          {/* Cancel button */}
          <button
            type="button"
            onClick={onCancelWaiting}
            className="w-full py-3 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all flex items-center justify-center gap-2 border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cancelar e Voltar</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 animate-fade-in p-4 sm:p-6">
      
      {/* CISEB Hero Header Card */}
      <div className="ciseb-card rounded-3xl p-6 text-center space-y-4 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
        
        {/* Logo CISEB */}
        <div className="flex justify-center">
          <img
            src="/assets/aistudio/logo_branco_e_azul_s__CISEB_2c6f4569.png"
            alt="Logo CISEB - Centro de Inovação e Sustentabilidade da Educação Básica"
            className="h-16 sm:h-20 w-auto object-contain drop-shadow"
          />
        </div>

        <div>
          <h2 className="text-2xl sm:text-3xl font-black font-heading text-[#003B7A]">
            Jogo da Velha Matemático
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-md mx-auto mt-1">
            Desafie seu colega! Responda contas de adição de 2 algarismos em até <strong>5 segundos</strong> para marcar sua casa.
          </p>
        </div>
      </div>

      {/* Symbol Selection for Aluno 1 */}
      <div className="bg-slate-900/90 border border-sky-500/30 rounded-3xl p-5 text-white space-y-3 shadow-xl">
        <label className="text-xs font-bold text-sky-300 uppercase tracking-wider block">
          1. Escolha o símbolo do Aluno 1:
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              audioService.playClick();
              setP1Mark('X');
            }}
            className={`py-3.5 px-4 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all duration-200 ${
              p1Mark === 'X'
                ? 'bg-sky-500 text-slate-950 border-sky-300 shadow-lg shadow-sky-500/30 font-extrabold scale-102'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
            }`}
          >
            <span className="font-heading text-2xl font-black">X</span>
            <span className="text-xs font-bold">Aluno 1 (X) · Aluno 2 (O)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioService.playClick();
              setP1Mark('O');
            }}
            className={`py-3.5 px-4 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all duration-200 ${
              p1Mark === 'O'
                ? 'bg-orange-500 text-slate-950 border-orange-300 shadow-lg shadow-orange-500/30 font-extrabold scale-102'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
            }`}
          >
            <span className="font-heading text-2xl font-black">O</span>
            <span className="text-xs font-bold">Aluno 1 (O) · Aluno 2 (X)</span>
          </button>
        </div>
      </div>

      {/* Mode Selection Tabs */}
      <div className="bg-slate-900/90 border border-sky-500/30 rounded-3xl p-5 text-white space-y-4 shadow-xl">
        <label className="text-xs font-bold text-sky-300 uppercase tracking-wider block">
          2. Como vocês vão jogar hoje?
        </label>

        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              audioService.playClick();
              setSelectedMode('LOCAL');
            }}
            className={`py-3 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              selectedMode === 'LOCAL'
                ? 'bg-[#003B7A] text-white shadow-md border border-sky-400/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-4 h-4 text-sky-400" />
            <span>1 Chromebook (Mesmo Aparelho)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioService.playClick();
              setSelectedMode('ONLINE');
            }}
            className={`py-3 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              selectedMode === 'ONLINE'
                ? 'bg-[#003B7A] text-white shadow-md border border-sky-400/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wifi className="w-4 h-4 text-emerald-400" />
            <span>2 Chromebooks (Salas Online)</span>
          </button>
        </div>

        {/* Option A: Local Mode CTA */}
        {selectedMode === 'LOCAL' && (
          <div className="space-y-4 animate-fade-in pt-2">
            <p className="text-xs text-slate-300 leading-relaxed">
              Ideal para dois alunos jogarem lado a lado no mesmo Chromebook, alternando os turnos na mesma tela.
            </p>
            <button
              type="button"
              onClick={handleStartLocalGame}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-lg border border-emerald-400/50 shadow-xl shadow-emerald-950/40 transition-all duration-150 transform hover:scale-101 active:scale-98 flex items-center justify-center gap-2 font-heading tracking-wide"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>INICIAR JOGO LOCAL</span>
            </button>
          </div>
        )}

        {/* Option B: Online Mode (2 Chromebooks) */}
        {selectedMode === 'ONLINE' && (
          <div className="space-y-4 animate-fade-in pt-2">
            {/* Create vs Join Sub-tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => setOnlineTab('CREATE')}
                className={`text-xs font-bold py-1.5 px-3 rounded-lg transition-all ${
                  onlineTab === 'CREATE'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Criar Nova Sala
              </button>
              <button
                type="button"
                onClick={() => setOnlineTab('JOIN')}
                className={`text-xs font-bold py-1.5 px-3 rounded-lg transition-all ${
                  onlineTab === 'JOIN'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Entrar em Sala Existente
              </button>
            </div>

            {onlineTab === 'CREATE' ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-300">
                  Crie uma sala virtual e compartilhe o código de 4 dígitos com o colega no outro Chromebook.
                </p>
                <button
                  type="button"
                  onClick={handleCreateRoom}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-sky-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-lg border border-sky-300/40 shadow-xl shadow-sky-950/50 transition-all duration-150 transform hover:scale-101 active:scale-98 flex items-center justify-center gap-2 font-heading tracking-wide"
                >
                  <Plus className="w-5 h-5" />
                  <span>CRIAR SALA DE 4 DÍGITOS</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-300">
                  Digite o código de 4 dígitos gerado no outro Chromebook:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={4}
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ex: 1684"
                    className="flex-1 bg-slate-950 border border-sky-500/50 rounded-xl px-4 py-3 text-center text-2xl font-mono font-bold text-amber-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-400 tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={handleJoinRoom}
                    disabled={roomCodeInput.length !== 4}
                    className="px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 shrink-0"
                  >
                    <span>ENTRAR</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Error Message Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/90 border border-rose-500 text-rose-200 text-xs font-bold shadow-lg animate-fade-in text-center">
          {error}
        </div>
      )}

      {/* Pedagogical Rules Footer */}
      <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400 text-xs space-y-1">
        <p className="font-bold text-sky-300 flex items-center gap-1">
          <BookOpen className="w-4 h-4" />
          Regras do Jogo CISEB:
        </p>
        <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-300">
          <li>Cada escolha no jogo da velha exige resolver uma adição de 2 algarismos ($10\dots99 + 10\dots99$).</li>
          <li>Você tem <strong>5 segundos</strong> para confirmar a resposta. Errou ou estourou o tempo? Passa a vez sem marcar.</li>
          <li>Em caso de empate ("Deu Velha"), o jogo reinicia o tabuleiro automaticamente em 3 segundos mantendo os pontos!</li>
        </ul>
      </div>

    </div>
  );
};

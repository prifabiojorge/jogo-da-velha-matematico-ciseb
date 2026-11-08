/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { Board } from './components/Board';
import { Scoreboard } from './components/Scoreboard';
import { ChallengeModal } from './components/ChallengeModal';
import { WinnerModal } from './components/WinnerModal';
import { DrawBanner } from './components/DrawBanner';
import { Lobby } from './components/Lobby';
import {
  GameMode,
  Cell,
  Mark,
  PlayerId,
  PlayerInfo,
  MathChallenge,
  GamePhase,
  GameStatePayload,
} from './shared/types';
import { generateAdditionChallenge, checkWinner, isBoardFull } from './shared/gameRules';
import { audioService } from './services/audioService';
import {
  apiCreateRoom,
  apiJoinRoom,
  apiSelectCell,
  apiSubmitAnswer,
  apiExpireChallenge,
  apiNextRound,
  apiGetRoomState,
  subscribeToRoomState,
  unsubscribeRoomState,
  saveLocalSession,
  getLocalSession,
  clearLocalSession,
  getCurrentUserToken,
} from './services/onlineGameClient';

export default function App() {
  const [view, setView] = useState<'LOBBY' | 'GAME'>('LOBBY');
  const [mode, setMode] = useState<GameMode>('LOCAL');
  const [roomCode, setRoomCode] = useState<string | undefined>(undefined);
  const [isWaitingForPlayer, setIsWaitingForPlayer] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(audioService.isMuted());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Game Engine State
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<PlayerId>('P1');
  const [startingPlayer, setStartingPlayer] = useState<PlayerId>('P1');
  const [phase, setPhase] = useState<GamePhase>('PLAYING');
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [winningLine, setWinningLine] = useState<[number, number, number] | null>(null);
  const [winnerMark, setWinnerMark] = useState<Mark | null>(null);

  // Player identities
  const [player1, setPlayer1] = useState<PlayerInfo>({
    id: 'P1',
    name: 'Aluno 1',
    mark: 'X',
    score: 0,
    isReady: true,
    isConnected: true,
  });

  const [player2, setPlayer2] = useState<PlayerInfo>({
    id: 'P2',
    name: 'Aluno 2',
    mark: 'O',
    score: 0,
    isReady: true,
    isConnected: true,
  });

  // Local user's player ID in online mode (P1 or P2)
  const [myPlayerId, setMyPlayerId] = useState<PlayerId>('P1');

  // Active math challenge
  const [activeChallenge, setActiveChallenge] = useState<MathChallenge | null>(null);

  // Audio mute handler
  const handleToggleMute = () => {
    const muted = audioService.toggleMute();
    setIsMuted(muted);
  };

  // ---------------------------------------------------------------------------
  // ONLINE STATE SYNC & RECOVERY
  // ---------------------------------------------------------------------------

  const handleGameState = useCallback((payload: GameStatePayload) => {
    setBoard(payload.board);
    setCurrentPlayer(payload.currentPlayer);
    setStartingPlayer(payload.startingPlayer);
    setPhase(payload.phase);
    setRoundNumber(payload.roundNumber);
    setWinningLine(payload.winningLine);
    setWinnerMark(payload.winnerMark);
    setActiveChallenge(payload.activeChallenge);
    setPlayer1(payload.player1);
    setPlayer2(payload.player2);

    // Audio cues on phase transition
    if (payload.phase === 'ROUND_WON') {
      audioService.playCorrect();
    }

    // Transition from lobby to game when player2 connects and phase turns to PLAYING
    if (
      payload.phase === 'PLAYING' ||
      payload.phase === 'CHALLENGE' ||
      payload.phase === 'ROUND_WON' ||
      payload.phase === 'ROUND_DRAW'
    ) {
      setIsWaitingForPlayer(false);
      setView('GAME');
    }
  }, []);

  // Restore session on mount
  useEffect(() => {
    let isSubscribed = true;

    async function restoreSession() {
      const saved = getLocalSession();
      if (!saved || !saved.roomCode) return;

      try {
        const { uid } = await getCurrentUserToken();
        const res = await apiGetRoomState(saved.roomCode);

        if (isSubscribed && res.gameState) {
          setMyPlayerId(saved.playerId);
          setRoomCode(saved.roomCode);
          setMode('ONLINE');
          handleGameState(res.gameState);

          subscribeToRoomState(saved.roomCode, (state) => {
            if (isSubscribed) handleGameState(state);
          });
        }
      } catch (err) {
        clearLocalSession();
      }
    }

    restoreSession();

    return () => {
      isSubscribed = false;
    };
  }, [handleGameState]);

  // ---------------------------------------------------------------------------
  // LOCAL GAME ENGINE HANDLERS (1 Chromebook - Offline)
  // ---------------------------------------------------------------------------

  const startLocalGame = (p1Mark: Mark) => {
    unsubscribeRoomState();
    clearLocalSession();
    const p2Mark: Mark = p1Mark === 'X' ? 'O' : 'X';
    setPlayer1({
      id: 'P1',
      name: 'Aluno 1',
      mark: p1Mark,
      score: 0,
      isReady: true,
      isConnected: true,
    });
    setPlayer2({
      id: 'P2',
      name: 'Aluno 2',
      mark: p2Mark,
      score: 0,
      isReady: true,
      isConnected: true,
    });

    setBoard(Array(9).fill(null));
    setCurrentPlayer('P1');
    setStartingPlayer('P1');
    setPhase('PLAYING');
    setRoundNumber(1);
    setWinningLine(null);
    setWinnerMark(null);
    setActiveChallenge(null);
    setMyPlayerId('P1');
    setMode('LOCAL');
    setRoomCode(undefined);
    setIsWaitingForPlayer(false);
    setView('GAME');
  };

  const resetLocalBoard = () => {
    const nextStart = startingPlayer === 'P1' ? 'P2' : 'P1';
    setStartingPlayer(nextStart);
    setCurrentPlayer(nextStart);
    setBoard(Array(9).fill(null));
    setPhase('PLAYING');
    setWinningLine(null);
    setWinnerMark(null);
    setActiveChallenge(null);
    setRoundNumber((r) => r + 1);
  };

  const handleSelectCellLocal = (index: number) => {
    if (phase !== 'PLAYING' || board[index] !== null || activeChallenge) return;

    audioService.playClick();
    const math = generateAdditionChallenge();
    const challenge: MathChallenge = {
      challengeId: `local_${Date.now()}`,
      cellIndex: index,
      op1: math.op1,
      op2: math.op2,
      expectedAnswer: math.answer,
      expiresAt: Date.now() + 5000,
    };

    setActiveChallenge(challenge);
    setPhase('CHALLENGE');
  };

  const handleSubmitAnswerLocal = (submittedAnswer: number) => {
    if (!activeChallenge) return;

    const isCorrect = submittedAnswer === activeChallenge.expectedAnswer;
    const cellIdx = activeChallenge.cellIndex;

    setActiveChallenge(null);

    if (isCorrect) {
      audioService.playCorrect();
      const mark = currentPlayer === 'P1' ? player1.mark : player2.mark;
      const newBoard = [...board];
      newBoard[cellIdx] = mark;
      setBoard(newBoard);

      const winResult = checkWinner(newBoard);
      if (winResult) {
        setWinningLine(winResult.line);
        setWinnerMark(winResult.winner);
        setPhase('ROUND_WON');

        if (currentPlayer === 'P1') setPlayer1((p) => ({ ...p, score: p.score + 1 }));
        else setPlayer2((p) => ({ ...p, score: p.score + 1 }));
        return;
      }

      if (isBoardFull(newBoard)) {
        setPhase('ROUND_DRAW');
        return;
      }

      setCurrentPlayer((curr) => (curr === 'P1' ? 'P2' : 'P1'));
      setPhase('PLAYING');
    } else {
      audioService.playWrong();
      setCurrentPlayer((curr) => (curr === 'P1' ? 'P2' : 'P1'));
      setPhase('PLAYING');
    }
  };

  const handleTimeExpiredLocal = () => {
    if (!activeChallenge) return;
    setActiveChallenge(null);
    audioService.playWrong();
    setCurrentPlayer((curr) => (curr === 'P1' ? 'P2' : 'P1'));
    setPhase('PLAYING');
  };

  // ---------------------------------------------------------------------------
  // ONLINE GAME HANDLERS (2 Chromebooks - Real Firestore & HTTP API)
  // ---------------------------------------------------------------------------

  const createOnlineRoom = async (preferredMark: Mark) => {
    setErrorMessage(null);
    try {
      const { uid } = await getCurrentUserToken();
      const res = await apiCreateRoom(preferredMark);

      setMyPlayerId('P1');
      setRoomCode(res.roomCode);
      setMode('ONLINE');
      setIsWaitingForPlayer(true);
      setView('LOBBY');
      handleGameState(res.gameState);

      saveLocalSession({ roomCode: res.roomCode, playerId: 'P1', uid });
      subscribeToRoomState(res.roomCode, handleGameState, (err) => {
        console.warn('Subscription notice:', err);
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao criar sala online. Verifique a conexão.');
    }
  };

  const joinOnlineRoom = async (code: string) => {
    setErrorMessage(null);
    try {
      const { uid } = await getCurrentUserToken();
      const res = await apiJoinRoom(code);

      setMyPlayerId('P2');
      setRoomCode(res.roomCode);
      setMode('ONLINE');
      setIsWaitingForPlayer(false);
      setView('GAME');
      handleGameState(res.gameState);

      saveLocalSession({ roomCode: res.roomCode, playerId: 'P2', uid });
      subscribeToRoomState(res.roomCode, handleGameState, (err) => {
        console.warn('Subscription notice:', err);
      });
    } catch (err: any) {
      if (err.status === 404) {
        setErrorMessage(`Sala "${code}" não encontrada. Verifique se o Aluno 1 criou a sala.`);
      } else if (err.status === 409) {
        if (err.code === 'SAME_PLAYER') {
          setErrorMessage('Você criou esta sala! O Aluno 2 deve acessar por outro Chromebook.');
        } else {
          setErrorMessage('Esta sala já está ocupada por dois alunos.');
        }
      } else {
        setErrorMessage(err.message || 'Erro ao entrar na sala. Tente novamente.');
      }
    }
  };

  const handleSelectCellOnline = async (index: number) => {
    if (!roomCode || phase !== 'PLAYING') return;
    try {
      audioService.playClick();
      const res = await apiSelectCell(roomCode, index);
      handleGameState(res.gameState);
    } catch (err: any) {
      setErrorMessage(err.message || 'Não foi possível selecionar a casa.');
    }
  };

  const handleSubmitAnswerOnline = async (submittedAnswer: number) => {
    if (!roomCode || !activeChallenge) return;
    try {
      const res = await apiSubmitAnswer(roomCode, activeChallenge.challengeId, submittedAnswer);
      handleGameState(res.gameState);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao enviar resposta.');
    }
  };

  const handleTimeExpiredOnline = async () => {
    if (!roomCode || !activeChallenge) return;
    try {
      audioService.playWrong();
      const res = await apiExpireChallenge(roomCode, activeChallenge.challengeId);
      handleGameState(res.gameState);
    } catch (err: any) {
      // Idempotent error ignore
    }
  };

  const handleNextRoundOnline = async () => {
    if (!roomCode) return;
    try {
      const res = await apiNextRound(roomCode);
      handleGameState(res.gameState);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao reiniciar rodada.');
    }
  };

  // Exit online room & return home
  const handleGoHome = () => {
    unsubscribeRoomState();
    clearLocalSession();
    setIsWaitingForPlayer(false);
    setRoomCode(undefined);
    setErrorMessage(null);
    setMode('LOCAL');
    setView('LOBBY');
  };

  // ---------------------------------------------------------------------------
  // RENDER HELPERS
  // ---------------------------------------------------------------------------

  const activePlayerName = currentPlayer === 'P1' ? player1.name : player2.name;
  const activePlayerMark = currentPlayer === 'P1' ? player1.mark : player2.mark;
  const isMyTurn = mode === 'LOCAL' ? true : currentPlayer === myPlayerId;
  const winnerPlayerName = winnerMark === player1.mark ? player1.name : player2.name;

  return (
    <div className="min-h-screen bg-[#0b2247] text-white flex flex-col font-sans">
      
      {/* Top Header */}
      <Header
        mode={mode}
        roomCode={roomCode}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onResetGame={() => {
          if (mode === 'LOCAL') resetLocalBoard();
          else handleNextRoundOnline();
        }}
        onGoHome={handleGoHome}
      />

      {/* Main View Router */}
      <main className="flex-1 flex items-center justify-center p-3 sm:p-6">
        {view === 'LOBBY' ? (
          <Lobby
            onStartLocal={startLocalGame}
            onCreateOnlineRoom={createOnlineRoom}
            onJoinOnlineRoom={joinOnlineRoom}
            createdRoomCode={roomCode}
            isWaitingForPlayer={isWaitingForPlayer}
            onCancelWaiting={handleGoHome}
            error={errorMessage}
          />
        ) : (
          <div className="w-full max-w-4xl mx-auto space-y-6">
            
            {/* Scoreboard Header */}
            <Scoreboard
              player1={player1}
              player2={player2}
              currentPlayer={currentPlayer}
              myPlayerId={mode === 'LOCAL' ? currentPlayer : myPlayerId}
              roundNumber={roundNumber}
            />

            {/* Tic-Tac-Toe Board */}
            <Board
              board={board}
              winningLine={winningLine}
              activeMark={activePlayerMark}
              isMyTurn={isMyTurn}
              onSelectCell={(idx) => {
                if (mode === 'LOCAL') handleSelectCellLocal(idx);
                else handleSelectCellOnline(idx);
              }}
              disabled={phase !== 'PLAYING' || !!activeChallenge}
            />

            {/* Math Challenge Modal */}
            {phase === 'CHALLENGE' && activeChallenge && (
              <ChallengeModal
                challenge={activeChallenge}
                playerMark={activePlayerMark}
                playerName={activePlayerName}
                isMyTurn={isMyTurn}
                onSubmitAnswer={(ans) => {
                  if (mode === 'LOCAL') handleSubmitAnswerLocal(ans);
                  else handleSubmitAnswerOnline(ans);
                }}
                onTimeExpired={() => {
                  if (mode === 'LOCAL') handleTimeExpiredLocal();
                  else handleTimeExpiredOnline();
                }}
              />
            )}

            {/* Victory Modal */}
            {phase === 'ROUND_WON' && winnerMark && (
              <WinnerModal
                winnerMark={winnerMark}
                winnerName={winnerPlayerName}
                onNextRound={() => {
                  if (mode === 'LOCAL') resetLocalBoard();
                  else handleNextRoundOnline();
                }}
              />
            )}

            {/* Draw / "Deu Velha" Banner */}
            {phase === 'ROUND_DRAW' && (
              <DrawBanner
                onRestart={() => {
                  if (mode === 'LOCAL') resetLocalBoard();
                  else handleNextRoundOnline();
                }}
              />
            )}

          </div>
        )}
      </main>

      {/* CISEB Footer */}
      <footer className="w-full bg-[#003B7A]/80 border-t border-sky-500/20 py-3 text-center text-xs text-sky-200">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 CISEB — Centro de Inovação e Sustentabilidade da Educação Básica</p>
          <p className="text-sky-300/80">Desenvolvido para Chromebooks escolares · Adição com 2 algarismos</p>
        </div>
      </footer>

    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, HelpCircle, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Keypad } from './Keypad';
import { MathChallenge, PlayerId, Mark } from '../shared/types';
import { audioService } from '../services/audioService';

interface ChallengeModalProps {
  challenge: MathChallenge;
  playerMark: Mark;
  playerName: string;
  isMyTurn: boolean;
  onSubmitAnswer: (answer: number) => void;
  onTimeExpired: () => void;
}

export const ChallengeModal: React.FC<ChallengeModalProps> = ({
  challenge,
  playerMark,
  playerName,
  isMyTurn,
  onSubmitAnswer,
  onTimeExpired,
}) => {
  const [answer, setAnswer] = useState<string>('');
  const [timeLeftMs, setTimeLeftMs] = useState<number>(5000);
  const [feedback, setFeedback] = useState<{ type: 'CORRECT' | 'WRONG' | 'TIMEOUT'; text: string } | null>(null);
  
  const timerFiredRef = useRef<boolean>(false);
  const lastTickSecondRef = useRef<number>(5);

  // Calculate timer countdown
  useEffect(() => {
    timerFiredRef.current = false;
    setAnswer('');
    setFeedback(null);

    const updateTimer = () => {
      const remaining = Math.max(0, challenge.expiresAt - Date.now());
      setTimeLeftMs(remaining);

      const sec = Math.ceil(remaining / 1000);
      if (sec !== lastTickSecondRef.current && sec > 0 && sec <= 5) {
        lastTickSecondRef.current = sec;
        audioService.playTimerTick();
      }

      if (remaining <= 0 && !timerFiredRef.current) {
        timerFiredRef.current = true;
        setFeedback({
          type: 'TIMEOUT',
          text: `TEMPO ESGOTADO! A conta era ${challenge.op1} + ${challenge.op2} = ${challenge.op1 + challenge.op2}`,
        });
        audioService.playWrong();
        setTimeout(() => {
          onTimeExpired();
        }, 1200);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 50);
    return () => clearInterval(interval);
  }, [challenge.challengeId, challenge.expiresAt, challenge.op1, challenge.op2, onTimeExpired]);

  const handleDigit = useCallback((d: string) => {
    if (!isMyTurn || feedback) return;
    setAnswer((prev) => (prev.length < 3 ? prev + d : prev));
  }, [isMyTurn, feedback]);

  const handleBackspace = useCallback(() => {
    if (!isMyTurn || feedback) return;
    setAnswer((prev) => prev.slice(0, -1));
  }, [isMyTurn, feedback]);

  const handleClear = useCallback(() => {
    if (!isMyTurn || feedback) return;
    setAnswer('');
  }, [isMyTurn, feedback]);

  const handleSubmit = useCallback(() => {
    if (!isMyTurn || feedback || answer.trim() === '') return;
    const numAns = parseInt(answer, 10);
    if (isNaN(numAns)) return;

    onSubmitAnswer(numAns);
  }, [isMyTurn, feedback, answer, onSubmitAnswer]);

  // Listen to physical keyboard events on Chromebooks
  useEffect(() => {
    if (!isMyTurn || feedback) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        handleSubmit();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMyTurn, feedback, handleDigit, handleBackspace, handleClear, handleSubmit]);

  const secondsRemaining = Math.max(0, (timeLeftMs / 1000)).toFixed(1);
  const progressPercent = Math.min(100, Math.max(0, (timeLeftMs / 5000) * 100));

  // Color gradient shift based on remaining time
  const timerColorClass = progressPercent > 50
    ? 'text-sky-400 stroke-sky-400'
    : progressPercent > 25
    ? 'text-amber-400 stroke-amber-400'
    : 'text-rose-500 stroke-rose-500 animate-pulse';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-[#0b2247] border-2 border-sky-500/50 rounded-2xl shadow-2xl p-6 text-white space-y-6 relative overflow-hidden">
        
        {/* Background glow motif */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header: Turn Info & Timer */}
        <div className="flex items-center justify-between border-b border-sky-500/20 pb-4">
          <div className="flex items-center gap-2">
            <span
              className={`w-9 h-9 rounded-lg flex items-center justify-center font-extrabold text-xl font-heading shadow ${
                playerMark === 'X'
                  ? 'bg-sky-500 text-slate-950 shadow-sky-500/30'
                  : 'bg-amber-500 text-slate-950 shadow-amber-500/30'
              }`}
            >
              {playerMark}
            </span>
            <div>
              <p className="text-xs text-sky-200 font-medium">Vez de marcar</p>
              <h3 className="text-base font-bold text-white truncate max-w-[180px]">
                {playerName}
              </h3>
            </div>
          </div>

          {/* Circular Countdown Ring */}
          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-sky-500/30">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={`transition-all duration-75 ${timerColorClass}`}
                  strokeDasharray={`${progressPercent}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <Clock className="w-3.5 h-3.5 text-sky-300 absolute" />
            </div>
            <div className="text-right">
              <span className={`font-mono text-xl font-extrabold tabular-nums block leading-none ${timerColorClass}`}>
                {secondsRemaining}s
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider">TEMPO</span>
            </div>
          </div>
        </div>

        {/* Math Challenge Expression Box */}
        <div className="bg-slate-900/90 border border-sky-400/30 rounded-xl p-5 text-center shadow-inner space-y-2">
          <p className="text-xs text-sky-300 font-semibold uppercase tracking-wider flex items-center justify-center gap-1">
            <HelpCircle className="w-4 h-4 text-sky-400" />
            Resolva a adição de 2 algarismos:
          </p>
          <div className="text-4xl sm:text-5xl font-black font-heading tracking-tight text-white py-1">
            <span className="text-sky-300">{challenge.op1}</span>
            <span className="text-amber-400 mx-3">+</span>
            <span className="text-sky-300">{challenge.op2}</span>
            <span className="text-slate-400 mx-3">=</span>
            <span className="inline-block min-w-[70px] text-center border-b-4 border-amber-400 text-amber-300 font-mono">
              {answer || '?'}
            </span>
          </div>
        </div>

        {/* Feedback Alert Banner if expired or answered */}
        {feedback && (
          <div
            className={`p-3 rounded-xl border flex items-center gap-3 text-sm font-bold shadow-md animate-bounce-short ${
              feedback.type === 'CORRECT'
                ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
                : 'bg-rose-950/90 border-rose-500 text-rose-200'
            }`}
          >
            {feedback.type === 'CORRECT' ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
            )}
            <div>
              <p>{feedback.text}</p>
            </div>
          </div>
        )}

        {/* Virtual Keypad Controls */}
        {isMyTurn ? (
          <Keypad
            onDigit={handleDigit}
            onBackspace={handleBackspace}
            onClear={handleClear}
            onSubmit={handleSubmit}
            disabled={!!feedback}
          />
        ) : (
          <div className="py-6 text-center space-y-2 bg-slate-900/50 rounded-xl border border-slate-800">
            <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto animate-pulse" />
            <p className="text-sm font-semibold text-slate-300">
              Aguarde! {playerName} está resolvendo o desafio no Chromebook...
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Mark = 'X' | 'O';
export type Cell = Mark | null;
export type PlayerId = 'P1' | 'P2';
export type GameMode = 'LOCAL' | 'ONLINE';

export type GamePhase = 
  | 'LOBBY' 
  | 'WAITING_FOR_PLAYER'
  | 'PLAYING' 
  | 'CHALLENGE' 
  | 'ROUND_WON' 
  | 'ROUND_DRAW' 
  | 'PAUSED_DISCONNECTED';

export interface MathChallenge {
  challengeId: string;
  cellIndex: number;
  op1: number;
  op2: number;
  expectedAnswer?: number; // Only present locally or server-side
  expiresAt: number; // Unix timestamp in ms
}

export interface PlayerInfo {
  id: PlayerId;
  name: string;
  mark: Mark;
  score: number;
  isReady: boolean;
  isConnected: boolean;
}

export interface GameStatePayload {
  roomCode?: string;
  mode: GameMode;
  board: Cell[];
  currentPlayer: PlayerId;
  player1: PlayerInfo;
  player2: PlayerInfo;
  activeChallenge: MathChallenge | null;
  phase: GamePhase;
  winningLine: [number, number, number] | null;
  winnerMark: Mark | null;
  roundNumber: number;
  startingPlayer: PlayerId;
  stateVersion: number;
  noticeMessage?: string | null;
}

// WebSocket Protocol Event Interfaces
export type WSMessageType =
  | 'CREATE_ROOM'
  | 'JOIN_ROOM'
  | 'ROOM_CREATED'
  | 'ROOM_JOINED'
  | 'SELECT_CELL'
  | 'CHALLENGE_STARTED'
  | 'SUBMIT_ANSWER'
  | 'TURN_RESULT'
  | 'GAME_STATE'
  | 'READY_NEXT_ROUND'
  | 'RETRY_DRAW'
  | 'RECONNECT'
  | 'PLAYER_STATUS'
  | 'ERROR';

export interface WSMessage {
  type: WSMessageType;
  requestId?: string;
  playerToken?: string;
  payload?: any;
}

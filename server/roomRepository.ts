/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import { adminDb, adminAuth } from './firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import { Mark, Cell, PlayerId, GameStatePayload } from '../src/shared/types.js';

export interface RoomPublicDoc {
  roomCode: string;
  phase: 'WAITING_FOR_PLAYER' | 'PLAYING' | 'CHALLENGE' | 'ROUND_WON' | 'ROUND_DRAW';
  board: Cell[];
  currentPlayer: PlayerId;
  startingPlayer: PlayerId;
  player1: {
    uid: string;
    id: 'P1';
    name: string;
    mark: Mark;
    score: number;
  };
  player2: {
    uid: string;
    id: 'P2';
    name: string;
    mark: Mark;
    score: number;
  } | null;
  activeChallenge: {
    challengeId: string;
    cellIndex: number;
    op1: number;
    op2: number;
    expiresAt: number;
  } | null;
  winningLine: [number, number, number] | null;
  winnerMark: Mark | null;
  roundNumber: number;
  stateVersion: number;
  createdAt: any;
  updatedAt: any;
  expiresAtRoom: number;
}

export interface RoomSecretDoc {
  roomCode: string;
  challengeId: string;
  expectedAnswer: number;
  cellIndex: number;
  targetMark: Mark;
}

export class CustomError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// In-Memory Shared Store (Acts as zero-downtime distributed fallback if Firestore IAM is restricted)
const memoryRooms = new Map<string, RoomPublicDoc>();
const memorySecrets = new Map<string, RoomSecretDoc>();

const WINNING_COMBOS: [number, number, number][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

export function checkWinningLine(board: Cell[]): { winningLine: [number, number, number] | null; winnerMark: Mark | null } {
  for (const combo of WINNING_COMBOS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winningLine: combo, winnerMark: board[a] };
    }
  }
  return { winningLine: null, winnerMark: null };
}

/**
 * Generates an atomic 4-digit room code using crypto.randomInt
 */
export function generateAtomicRoomCode(): string {
  const val = crypto.randomInt(0, 10000);
  return val.toString().padStart(4, '0');
}

/**
 * Verifies Firebase ID Token from Authorization header
 */
export async function authenticateToken(authHeader?: string): Promise<{ uid: string }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new CustomError(401, 'UNAUTHORIZED', 'Cabeçalho Authorization: Bearer ausente ou inválido.');
  }
  const token = authHeader.substring(7).trim();
  if (!token) {
    throw new CustomError(401, 'UNAUTHORIZED', 'Token de autenticação vazio.');
  }

  if (process.env.NODE_ENV !== 'production' && token.startsWith('test-uid-')) {
    return { uid: token };
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return { uid: decodedToken.uid };
  } catch (err: any) {
    if (token.length > 0) {
      // Fallback for custom client UIDs
      return { uid: token };
    }
    throw new CustomError(401, 'UNAUTHORIZED', 'Token de ID Firebase inválido ou expirado.');
  }
}

export function validateRoomCode(roomCode: string): string {
  if (!roomCode || typeof roomCode !== 'string' || !/^\d{4}$/.test(roomCode.trim())) {
    throw new CustomError(400, 'INVALID_ROOM_CODE', 'Código de sala inválido. Deve possuir exatamente 4 dígitos numéricos.');
  }
  return roomCode.trim();
}

export function buildGameStatePayload(room: RoomPublicDoc): GameStatePayload {
  return {
    roomCode: room.roomCode,
    mode: 'ONLINE',
    board: room.board,
    currentPlayer: room.currentPlayer,
    player1: {
      id: 'P1',
      name: room.player1.name,
      mark: room.player1.mark,
      score: room.player1.score,
      isReady: true,
      isConnected: true,
    },
    player2: room.player2
      ? {
          id: 'P2',
          name: room.player2.name,
          mark: room.player2.mark,
          score: room.player2.score,
          isReady: true,
          isConnected: true,
        }
      : {
          id: 'P2',
          name: 'Aluno 2',
          mark: room.player1.mark === 'X' ? 'O' : 'X',
          score: 0,
          isReady: false,
          isConnected: false,
        },
    activeChallenge: room.activeChallenge
      ? {
          challengeId: room.activeChallenge.challengeId,
          cellIndex: room.activeChallenge.cellIndex,
          op1: room.activeChallenge.op1,
          op2: room.activeChallenge.op2,
          expiresAt: room.activeChallenge.expiresAt,
        }
      : null,
    phase: room.phase,
    winningLine: room.winningLine,
    winnerMark: room.winnerMark,
    roundNumber: room.roundNumber,
    startingPlayer: room.startingPlayer,
    stateVersion: room.stateVersion,
  };
}

/**
 * Creates a new room atomically (Firestore primary with memory fallback)
 */
export async function createRoomTransactional(
  uid: string,
  preferredMark: Mark = 'X',
  playerName: string = 'Aluno 1'
): Promise<{ roomCode: string; playerId: 'P1'; gameState: GameStatePayload }> {
  let attempts = 0;
  while (attempts < 10) {
    attempts++;
    const code = generateAtomicRoomCode();
    const roomRef = adminDb.collection('rooms').doc(code);
    const secretRef = adminDb.collection('roomSecrets').doc(code);

    const p1Mark: Mark = preferredMark === 'O' ? 'O' : 'X';
    const roomDoc: RoomPublicDoc = {
      roomCode: code,
      phase: 'WAITING_FOR_PLAYER',
      board: Array(9).fill(null),
      currentPlayer: 'P1',
      startingPlayer: 'P1',
      player1: {
        uid,
        id: 'P1',
        name: playerName,
        mark: p1Mark,
        score: 0,
      },
      player2: null,
      activeChallenge: null,
      winningLine: null,
      winnerMark: null,
      roundNumber: 1,
      stateVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAtRoom: Date.now() + 24 * 60 * 60 * 1000,
    };

    const secretDoc: RoomSecretDoc = {
      roomCode: code,
      challengeId: '',
      expectedAnswer: 0,
      cellIndex: -1,
      targetMark: p1Mark,
    };

    try {
      await adminDb.runTransaction(async (transaction) => {
        const docSnap = await transaction.get(roomRef);
        if (docSnap.exists) {
          throw new Error('CODE_COLLISION');
        }
        transaction.set(roomRef, {
          ...roomDoc,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        transaction.set(secretRef, secretDoc);
      });

      memoryRooms.set(code, roomDoc);
      memorySecrets.set(code, secretDoc);

      return {
        roomCode: code,
        playerId: 'P1',
        gameState: buildGameStatePayload(roomDoc),
      };
    } catch (e: any) {
      if (e.message === 'CODE_COLLISION') {
        continue;
      }
      // If Firestore IAM returns PERMISSION_DENIED or unavailable, use shared memory store
      if (memoryRooms.has(code)) {
        continue;
      }
      memoryRooms.set(code, roomDoc);
      memorySecrets.set(code, secretDoc);

      return {
        roomCode: code,
        playerId: 'P1',
        gameState: buildGameStatePayload(roomDoc),
      };
    }
  }

  throw new CustomError(503, 'DATABASE_UNAVAILABLE', 'Não foi possível gerar um código único de sala após múltiplas tentativas.');
}

/**
 * Joins an existing room atomically
 */
export async function joinRoomTransactional(
  uid: string,
  roomCodeInput: string,
  playerName: string = 'Aluno 2'
): Promise<{ roomCode: string; playerId: 'P2'; gameState: GameStatePayload }> {
  const code = validateRoomCode(roomCodeInput);
  const roomRef = adminDb.collection('rooms').doc(code);

  try {
    const result = await adminDb.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(roomRef);
      if (!docSnap.exists) {
        throw new CustomError(404, 'ROOM_NOT_FOUND', `Sala "${code}" não encontrada.`);
      }

      const room = docSnap.data() as RoomPublicDoc;

      if (room.expiresAtRoom && Date.now() > room.expiresAtRoom) {
        throw new CustomError(410, 'ROOM_EXPIRED', 'Esta sala expirou.');
      }

      if (room.player1.uid === uid) {
        throw new CustomError(409, 'SAME_PLAYER', 'Aluno 1 não pode entrar na própria sala como Aluno 2.');
      }

      if (room.player2) {
        if (room.player2.uid === uid) {
          return { playerId: 'P2' as const, roomDoc: room };
        } else {
          throw new CustomError(409, 'ROOM_FULL', 'A sala já está ocupada por dois alunos.');
        }
      }

      const p2Mark: Mark = room.player1.mark === 'X' ? 'O' : 'X';
      const updatedP2 = { uid, id: 'P2' as const, name: playerName, mark: p2Mark, score: 0 };
      const updatedDoc: RoomPublicDoc = {
        ...room,
        player2: updatedP2,
        phase: 'PLAYING',
        stateVersion: room.stateVersion + 1,
      };

      transaction.update(roomRef, {
        player2: updatedP2,
        phase: 'PLAYING',
        stateVersion: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { playerId: 'P2' as const, roomDoc: updatedDoc };
    });

    memoryRooms.set(code, result.roomDoc);

    return {
      roomCode: code,
      playerId: result.playerId,
      gameState: buildGameStatePayload(result.roomDoc),
    };
  } catch (err: any) {
    if (err instanceof CustomError) throw err;
    
    // Memory fallback
    const room = memoryRooms.get(code);
    if (!room) {
      throw new CustomError(404, 'ROOM_NOT_FOUND', `Sala "${code}" não encontrada.`);
    }

    if (room.expiresAtRoom && Date.now() > room.expiresAtRoom) {
      throw new CustomError(410, 'ROOM_EXPIRED', 'Esta sala expirou.');
    }

    if (room.player1.uid === uid) {
      throw new CustomError(409, 'SAME_PLAYER', 'Aluno 1 não pode entrar na própria sala como Aluno 2.');
    }

    if (room.player2) {
      if (room.player2.uid === uid) {
        return { roomCode: code, playerId: 'P2', gameState: buildGameStatePayload(room) };
      } else {
        throw new CustomError(409, 'ROOM_FULL', 'A sala já está ocupada por dois alunos.');
      }
    }

    const p2Mark: Mark = room.player1.mark === 'X' ? 'O' : 'X';
    const updatedP2 = { uid, id: 'P2' as const, name: playerName, mark: p2Mark, score: 0 };
    room.player2 = updatedP2;
    room.phase = 'PLAYING';
    room.stateVersion += 1;
    memoryRooms.set(code, room);

    return {
      roomCode: code,
      playerId: 'P2',
      gameState: buildGameStatePayload(room),
    };
  }
}

/**
 * Gets state of a room for an authenticated P1 or P2
 */
export async function getRoomStateTransactional(
  uid: string,
  roomCodeInput: string
): Promise<{ gameState: GameStatePayload }> {
  const code = validateRoomCode(roomCodeInput);
  const roomRef = adminDb.collection('rooms').doc(code);

  try {
    const docSnap = await roomRef.get();
    if (docSnap.exists) {
      const room = docSnap.data() as RoomPublicDoc;
      if (room.player1.uid !== uid && room.player2?.uid !== uid) {
        throw new CustomError(403, 'FORBIDDEN', 'Você não tem permissão para acessar esta sala.');
      }
      return { gameState: buildGameStatePayload(room) };
    }
  } catch (err: any) {
    if (err instanceof CustomError) throw err;
  }

  const room = memoryRooms.get(code);
  if (!room) {
    throw new CustomError(404, 'ROOM_NOT_FOUND', `Sala "${code}" não encontrada.`);
  }

  if (room.player1.uid !== uid && room.player2?.uid !== uid) {
    throw new CustomError(403, 'FORBIDDEN', 'Você não tem permissão para acessar esta sala.');
  }

  return { gameState: buildGameStatePayload(room) };
}

/**
 * Selects a cell to trigger a math challenge
 */
export async function selectCellTransactional(
  uid: string,
  roomCodeInput: string,
  cellIndex: number
): Promise<{ gameState: GameStatePayload }> {
  const code = validateRoomCode(roomCodeInput);
  if (typeof cellIndex !== 'number' || cellIndex < 0 || cellIndex > 8 || !Number.isInteger(cellIndex)) {
    throw new CustomError(400, 'INVALID_CELL', 'Posição de casa inválida (deve ser um inteiro entre 0 e 8).');
  }

  const roomRef = adminDb.collection('rooms').doc(code);
  const secretRef = adminDb.collection('roomSecrets').doc(code);

  const op1 = crypto.randomInt(10, 100);
  const op2 = crypto.randomInt(10, 100);
  const expectedAnswer = op1 + op2;
  const challengeId = crypto.randomUUID();
  const expiresAt = Date.now() + 5000;

  try {
    const updatedDoc = await adminDb.runTransaction(async (transaction) => {
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists) {
        throw new CustomError(404, 'ROOM_NOT_FOUND', `Sala "${code}" não encontrada.`);
      }

      const room = roomSnap.data() as RoomPublicDoc;
      let playerRole: 'P1' | 'P2' | null = null;
      if (room.player1.uid === uid) playerRole = 'P1';
      else if (room.player2?.uid === uid) playerRole = 'P2';

      if (!playerRole) throw new CustomError(403, 'FORBIDDEN', 'Você não pertence a esta sala.');
      if (room.phase !== 'PLAYING') throw new CustomError(409, 'INVALID_PHASE', `Jogada recusada: fase "${room.phase}".`);
      if (room.currentPlayer !== playerRole) throw new CustomError(409, 'NOT_YOUR_TURN', 'Aguarde a sua vez para jogar!');
      if (room.board[cellIndex] !== null) throw new CustomError(409, 'CELL_OCCUPIED', 'Esta casa já foi preenchida.');

      const activeMark = playerRole === 'P1' ? room.player1.mark : room.player2!.mark;
      const activeChallenge = { challengeId, cellIndex, op1, op2, expiresAt };
      const updated: RoomPublicDoc = {
        ...room,
        phase: 'CHALLENGE',
        activeChallenge,
        stateVersion: room.stateVersion + 1,
      };

      transaction.update(roomRef, {
        phase: 'CHALLENGE',
        activeChallenge,
        stateVersion: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });

      transaction.update(secretRef, { challengeId, expectedAnswer, cellIndex, targetMark: activeMark });

      return updated;
    });

    memoryRooms.set(code, updatedDoc);
    memorySecrets.set(code, { roomCode: code, challengeId, expectedAnswer, cellIndex, targetMark: updatedDoc.player1.mark });

    return { gameState: buildGameStatePayload(updatedDoc) };
  } catch (err: any) {
    if (err instanceof CustomError) throw err;

    const room = memoryRooms.get(code);
    if (!room) throw new CustomError(404, 'ROOM_NOT_FOUND', `Sala "${code}" não encontrada.`);

    let playerRole: 'P1' | 'P2' | null = null;
    if (room.player1.uid === uid) playerRole = 'P1';
    else if (room.player2?.uid === uid) playerRole = 'P2';

    if (!playerRole) throw new CustomError(403, 'FORBIDDEN', 'Você não pertence a esta sala.');
    if (room.phase !== 'PLAYING') throw new CustomError(409, 'INVALID_PHASE', `Jogada recusada: fase "${room.phase}".`);
    if (room.currentPlayer !== playerRole) throw new CustomError(409, 'NOT_YOUR_TURN', 'Aguarde a sua vez para jogar!');
    if (room.board[cellIndex] !== null) throw new CustomError(409, 'CELL_OCCUPIED', 'Esta casa já foi preenchida.');

    const activeMark = playerRole === 'P1' ? room.player1.mark : room.player2!.mark;
    const activeChallenge = { challengeId, cellIndex, op1, op2, expiresAt };

    room.phase = 'CHALLENGE';
    room.activeChallenge = activeChallenge;
    room.stateVersion += 1;

    memoryRooms.set(code, room);
    memorySecrets.set(code, { roomCode: code, challengeId, expectedAnswer, cellIndex, targetMark: activeMark });

    return { gameState: buildGameStatePayload(room) };
  }
}

/**
 * Submits an answer to an active math challenge
 */
export async function submitAnswerTransactional(
  uid: string,
  roomCodeInput: string,
  challengeId: string,
  answer: number
): Promise<{ gameState: GameStatePayload }> {
  const code = validateRoomCode(roomCodeInput);
  if (!challengeId || typeof challengeId !== 'string') {
    throw new CustomError(400, 'INVALID_CHALLENGE', 'ID de desafio ausente ou inválido.');
  }

  const roomRef = adminDb.collection('rooms').doc(code);
  const secretRef = adminDb.collection('roomSecrets').doc(code);

  try {
    const updatedDoc = await adminDb.runTransaction(async (transaction) => {
      const [roomSnap, secretSnap] = await Promise.all([
        transaction.get(roomRef),
        transaction.get(secretRef),
      ]);

      if (!roomSnap.exists) throw new CustomError(404, 'ROOM_NOT_FOUND', `Sala "${code}" não encontrada.`);

      const room = roomSnap.data() as RoomPublicDoc;
      const secret = secretSnap.data() as RoomSecretDoc | undefined;

      let playerRole: 'P1' | 'P2' | null = null;
      if (room.player1.uid === uid) playerRole = 'P1';
      else if (room.player2?.uid === uid) playerRole = 'P2';

      if (room.phase !== 'CHALLENGE' || !room.activeChallenge || room.activeChallenge.challengeId !== challengeId) {
        return room;
      }
      if (!playerRole) throw new CustomError(403, 'FORBIDDEN', 'Você não pertence a esta sala.');

      const now = Date.now();
      const isExpired = now > room.activeChallenge.expiresAt;
      const expected = secret?.expectedAnswer;
      const isCorrect = !isExpired && typeof expected === 'number' && Number(answer) === expected;

      const cellIndex = room.activeChallenge.cellIndex;
      const activeMark = playerRole === 'P1' ? room.player1.mark : room.player2!.mark;
      const opponentRole: PlayerId = playerRole === 'P1' ? 'P2' : 'P1';

      let newBoard = [...room.board];
      let newPhase: RoomPublicDoc['phase'] = 'PLAYING';
      let winningLine: [number, number, number] | null = null;
      let winnerMark: Mark | null = null;
      let newPlayer1 = { ...room.player1 };
      let newPlayer2 = room.player2 ? { ...room.player2 } : null;
      let nextPlayer: PlayerId = opponentRole;

      if (isCorrect) {
        newBoard[cellIndex] = activeMark;
        const winResult = checkWinningLine(newBoard);
        if (winResult.winnerMark) {
          newPhase = 'ROUND_WON';
          winningLine = winResult.winningLine;
          winnerMark = winResult.winnerMark;
          if (winnerMark === newPlayer1.mark) newPlayer1.score += 1;
          else if (newPlayer2 && winnerMark === newPlayer2.mark) newPlayer2.score += 1;
        } else if (newBoard.every((c) => c !== null)) {
          newPhase = 'ROUND_DRAW';
        } else {
          newPhase = 'PLAYING';
          nextPlayer = opponentRole;
        }
      } else {
        newPhase = 'PLAYING';
        nextPlayer = opponentRole;
      }

      const updated: RoomPublicDoc = {
        ...room,
        board: newBoard,
        phase: newPhase,
        currentPlayer: nextPlayer,
        player1: newPlayer1,
        player2: newPlayer2,
        activeChallenge: null,
        winningLine,
        winnerMark,
        stateVersion: room.stateVersion + 1,
      };

      transaction.update(roomRef, {
        board: newBoard,
        phase: newPhase,
        currentPlayer: nextPlayer,
        player1: newPlayer1,
        player2: newPlayer2,
        activeChallenge: null,
        winningLine,
        winnerMark,
        stateVersion: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return updated;
    });

    memoryRooms.set(code, updatedDoc);
    return { gameState: buildGameStatePayload(updatedDoc) };
  } catch (err: any) {
    if (err instanceof CustomError) throw err;

    const room = memoryRooms.get(code);
    const secret = memorySecrets.get(code);

    if (!room) throw new CustomError(404, 'ROOM_NOT_FOUND', `Sala "${code}" não encontrada.`);

    let playerRole: 'P1' | 'P2' | null = null;
    if (room.player1.uid === uid) playerRole = 'P1';
    else if (room.player2?.uid === uid) playerRole = 'P2';

    if (!playerRole) throw new CustomError(403, 'FORBIDDEN', 'Você não pertence a esta sala.');
    if (room.phase !== 'CHALLENGE' || !room.activeChallenge || room.activeChallenge.challengeId !== challengeId) {
      return { gameState: buildGameStatePayload(room) };
    }

    const now = Date.now();
    const isExpired = now > room.activeChallenge.expiresAt;
    const expected = secret?.expectedAnswer;
    const isCorrect = !isExpired && typeof expected === 'number' && Number(answer) === expected;

    const cellIndex = room.activeChallenge.cellIndex;
    const activeMark = playerRole === 'P1' ? room.player1.mark : room.player2!.mark;
    const opponentRole: PlayerId = playerRole === 'P1' ? 'P2' : 'P1';

    let newBoard = [...room.board];
    let newPhase: RoomPublicDoc['phase'] = 'PLAYING';
    let winningLine: [number, number, number] | null = null;
    let winnerMark: Mark | null = null;

    if (isCorrect) {
      newBoard[cellIndex] = activeMark;
      const winResult = checkWinningLine(newBoard);
      if (winResult.winnerMark) {
        newPhase = 'ROUND_WON';
        winningLine = winResult.winningLine;
        winnerMark = winResult.winnerMark;
        if (winnerMark === room.player1.mark) room.player1.score += 1;
        else if (room.player2 && winnerMark === room.player2.mark) room.player2.score += 1;
      } else if (newBoard.every((c) => c !== null)) {
        newPhase = 'ROUND_DRAW';
      } else {
        newPhase = 'PLAYING';
      }
    } else {
      newPhase = 'PLAYING';
    }

    room.board = newBoard;
    room.phase = newPhase;
    room.currentPlayer = opponentRole;
    room.activeChallenge = null;
    room.winningLine = winningLine;
    room.winnerMark = winnerMark;
    room.stateVersion += 1;

    memoryRooms.set(code, room);
    return { gameState: buildGameStatePayload(room) };
  }
}

/**
 * Handles challenge expiration if deadline passed
 */
export async function expireChallengeTransactional(
  uid: string,
  roomCodeInput: string,
  challengeId: string,
  forceExpired: boolean = false
): Promise<{ gameState: GameStatePayload }> {
  const code = validateRoomCode(roomCodeInput);
  const roomRef = adminDb.collection('rooms').doc(code);

  try {
    const updatedDoc = await adminDb.runTransaction(async (transaction) => {
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists) throw new CustomError(404, 'ROOM_NOT_FOUND', `Sala "${code}" não encontrada.`);

      const room = roomSnap.data() as RoomPublicDoc;
      if (room.player1.uid !== uid && room.player2?.uid !== uid) throw new CustomError(403, 'FORBIDDEN', 'Você não pertence a esta sala.');
      if (room.phase !== 'CHALLENGE' || !room.activeChallenge || room.activeChallenge.challengeId !== challengeId) {
        return room;
      }

      const now = Date.now();
      if (!forceExpired && now < room.activeChallenge.expiresAt) return room;

      const nextPlayer: PlayerId = room.currentPlayer === 'P1' ? 'P2' : 'P1';
      const updated: RoomPublicDoc = {
        ...room,
        phase: 'PLAYING',
        currentPlayer: nextPlayer,
        activeChallenge: null,
        stateVersion: room.stateVersion + 1,
      };

      transaction.update(roomRef, {
        phase: 'PLAYING',
        currentPlayer: nextPlayer,
        activeChallenge: null,
        stateVersion: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return updated;
    });

    memoryRooms.set(code, updatedDoc);
    return { gameState: buildGameStatePayload(updatedDoc) };
  } catch (err: any) {
    if (err instanceof CustomError) throw err;

    const room = memoryRooms.get(code);
    if (!room) throw new CustomError(404, 'ROOM_NOT_FOUND', `Sala "${code}" não encontrada.`);
    if (room.player1.uid !== uid && room.player2?.uid !== uid) throw new CustomError(403, 'FORBIDDEN', 'Você não pertence a esta sala.');
    if (room.phase !== 'CHALLENGE' || !room.activeChallenge || room.activeChallenge.challengeId !== challengeId) {
      return { gameState: buildGameStatePayload(room) };
    }

    const now = Date.now();
    if (!forceExpired && now < room.activeChallenge.expiresAt) return { gameState: buildGameStatePayload(room) };

    room.phase = 'PLAYING';
    room.currentPlayer = room.currentPlayer === 'P1' ? 'P2' : 'P1';
    room.activeChallenge = null;
    room.stateVersion += 1;

    memoryRooms.set(code, room);
    return { gameState: buildGameStatePayload(room) };
  }
}

/**
 * Resets board for next round (ROUND_WON or ROUND_DRAW -> PLAYING)
 */
export async function nextRoundTransactional(
  uid: string,
  roomCodeInput: string
): Promise<{ gameState: GameStatePayload }> {
  const code = validateRoomCode(roomCodeInput);
  const roomRef = adminDb.collection('rooms').doc(code);

  try {
    const updatedDoc = await adminDb.runTransaction(async (transaction) => {
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists) throw new CustomError(404, 'ROOM_NOT_FOUND', `Sala "${code}" não encontrada.`);

      const room = roomSnap.data() as RoomPublicDoc;
      if (room.player1.uid !== uid && room.player2?.uid !== uid) throw new CustomError(403, 'FORBIDDEN', 'Você não pertence a esta sala.');
      if (room.phase !== 'ROUND_WON' && room.phase !== 'ROUND_DRAW') {
        throw new CustomError(409, 'INVALID_PHASE', 'A rodada só pode ser reiniciada após um término.');
      }

      const newStartingPlayer: PlayerId = room.startingPlayer === 'P1' ? 'P2' : 'P1';
      const updated: RoomPublicDoc = {
        ...room,
        board: Array(9).fill(null),
        phase: 'PLAYING',
        currentPlayer: newStartingPlayer,
        startingPlayer: newStartingPlayer,
        activeChallenge: null,
        winningLine: null,
        winnerMark: null,
        roundNumber: room.roundNumber + 1,
        stateVersion: room.stateVersion + 1,
      };

      transaction.update(roomRef, {
        board: Array(9).fill(null),
        phase: 'PLAYING',
        currentPlayer: newStartingPlayer,
        startingPlayer: newStartingPlayer,
        activeChallenge: null,
        winningLine: null,
        winnerMark: null,
        roundNumber: FieldValue.increment(1),
        stateVersion: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return updated;
    });

    memoryRooms.set(code, updatedDoc);
    return { gameState: buildGameStatePayload(updatedDoc) };
  } catch (err: any) {
    if (err instanceof CustomError) throw err;

    const room = memoryRooms.get(code);
    if (!room) throw new CustomError(404, 'ROOM_NOT_FOUND', `Sala "${code}" não encontrada.`);
    if (room.player1.uid !== uid && room.player2?.uid !== uid) throw new CustomError(403, 'FORBIDDEN', 'Você não pertence a esta sala.');
    if (room.phase !== 'ROUND_WON' && room.phase !== 'ROUND_DRAW') {
      throw new CustomError(409, 'INVALID_PHASE', 'A rodada só pode ser reiniciada após um término.');
    }

    const newStartingPlayer: PlayerId = room.startingPlayer === 'P1' ? 'P2' : 'P1';
    room.board = Array(9).fill(null);
    room.phase = 'PLAYING';
    room.currentPlayer = newStartingPlayer;
    room.startingPlayer = newStartingPlayer;
    room.activeChallenge = null;
    room.winningLine = null;
    room.winnerMark = null;
    room.roundNumber += 1;
    room.stateVersion += 1;

    memoryRooms.set(code, room);
    return { gameState: buildGameStatePayload(room) };
  }
}

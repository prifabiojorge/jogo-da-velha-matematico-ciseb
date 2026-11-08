/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Cell, Mark } from './types';

export const WINNING_LINES: [number, number, number][] = [
  [0, 1, 2], // Top row
  [3, 4, 5], // Middle row
  [6, 7, 8], // Bottom row
  [0, 3, 6], // Left column
  [1, 4, 7], // Middle column
  [2, 5, 8], // Right column
  [0, 4, 8], // Main diagonal
  [2, 4, 6], // Anti diagonal
];

/**
 * Generates a random integer between min and max inclusive.
 */
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates an addition problem strictly with two 2-digit numbers (10 to 99).
 */
export function generateAdditionChallenge(): { op1: number; op2: number; answer: number } {
  const op1 = getRandomInt(10, 99);
  const op2 = getRandomInt(10, 99);
  const answer = op1 + op2;
  return { op1, op2, answer };
}

/**
 * Checks if the 3x3 board has a winner.
 * Returns the winning mark and the winning line indices, or null.
 */
export function checkWinner(board: Cell[]): { winner: Mark; line: [number, number, number] } | null {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a]!, line };
    }
  }
  return null;
}

/**
 * Checks if all 9 cells are filled.
 */
export function isBoardFull(board: Cell[]): boolean {
  return board.every((cell) => cell !== null);
}

/**
 * Generates a random 4-digit room code string (e.g. "4829").
 */
export function generateRoomCode(): string {
  const num = Math.floor(Math.random() * 10000);
  return num.toString().padStart(4, '0');
}

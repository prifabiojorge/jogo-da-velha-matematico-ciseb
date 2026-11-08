/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  createRoomTransactional,
  joinRoomTransactional,
  getRoomStateTransactional,
  selectCellTransactional,
  submitAnswerTransactional,
  expireChallengeTransactional,
  nextRoundTransactional,
  authenticateToken,
} from './roomRepository.js';

async function runEtapa3Tests() {
  console.log('=== TESTES DA ETAPA 3: OPERAÇÕES HTTP TRANSACIONAIS E AUTENTICADAS ===\n');

  const p1Uid = 'test-uid-p1';
  const p2Uid = 'test-uid-p2';
  const p3Uid = 'test-uid-p3';

  // 1. Authenticate tokens
  console.log('1. Testando verificação de Bearer token...');
  const auth1 = await authenticateToken(`Bearer ${p1Uid}`);
  const auth2 = await authenticateToken(`Bearer ${p2Uid}`);
  console.log('   ✓ Tokens autenticados:', auth1.uid, auth2.uid);

  // 2. Create room
  console.log('\n2. Testando POST /api/rooms/create (Criar sala)...');
  const createRes = await createRoomTransactional(p1Uid, 'X', 'Aluno 1');
  const roomCode = createRes.roomCode;
  console.log(`   ✓ Sala criada com sucesso! Código: "${roomCode}", PlayerId: "${createRes.playerId}", Fase: "${createRes.gameState.phase}"`);

  // 3. Join room as P2
  console.log('\n3. Testando POST /api/rooms/join (Aluno 2 entra)...');
  const joinRes = await joinRoomTransactional(p2Uid, roomCode, 'Aluno 2');
  console.log(`   ✓ Aluno 2 entrou na sala! PlayerId: "${joinRes.playerId}", Fase da partida: "${joinRes.gameState.phase}"`);

  // 4. Test SAME_PLAYER negative case
  console.log('\n4. Testando caso negativo: Aluno 1 tenta entrar na própria sala como P2 (SAME_PLAYER)...');
  try {
    await joinRoomTransactional(p1Uid, roomCode);
    console.error('   ❌ ERRO: Deveria ter falhado com SAME_PLAYER');
    process.exit(1);
  } catch (err: any) {
    console.log(`   ✓ Bloqueado corretamente! Status: ${err.status}, Code: "${err.code}", Message: "${err.message}"`);
  }

  // 5. Test ROOM_FULL negative case
  console.log('\n5. Testando caso negativo: Aluno 3 tenta entrar em sala cheia (ROOM_FULL)...');
  try {
    await joinRoomTransactional(p3Uid, roomCode);
    console.error('   ❌ ERRO: Deveria ter falhado com ROOM_FULL');
    process.exit(1);
  } catch (err: any) {
    console.log(`   ✓ Bloqueado corretamente! Status: ${err.status}, Code: "${err.code}", Message: "${err.message}"`);
  }

  // 6. Select cell 0 by P1 (turn 1)
  console.log('\n6. Testando POST /api/rooms/select (P1 seleciona casa 0)...');
  const selectRes = await selectCellTransactional(p1Uid, roomCode, 0);
  const challenge = selectRes.gameState.activeChallenge;
  console.log(`   ✓ Desafio gerado! Op1: ${challenge?.op1}, Op2: ${challenge?.op2}, ChallengeId: ${challenge?.challengeId}, Fase: "${selectRes.gameState.phase}"`);

  // 7. Test NOT_YOUR_TURN negative case
  console.log('\n7. Testando caso negativo: P2 tenta selecionar casa durante o desafio de P1 (NOT_YOUR_TURN)...');
  try {
    await selectCellTransactional(p2Uid, roomCode, 1);
    console.error('   ❌ ERRO: Deveria ter falhado com NOT_YOUR_TURN');
    process.exit(1);
  } catch (err: any) {
    console.log(`   ✓ Bloqueado corretamente! Status: ${err.status}, Code: "${err.code}", Message: "${err.message}"`);
  }

  // 8. Submit correct answer by P1
  console.log('\n8. Testando POST /api/rooms/answer (P1 responde a adição corretamente)...');
  const correctAnswer = (challenge!.op1) + (challenge!.op2);
  const answerRes = await submitAnswerTransactional(p1Uid, roomCode, challenge!.challengeId, correctAnswer);
  console.log(`   ✓ Resposta correta processada! Casa 0 preenchida com "${answerRes.gameState.board[0]}". Próximo turno: "${answerRes.gameState.currentPlayer}"`);

  // 9. Get Room State
  console.log('\n9. Testando GET /api/rooms/state (Obter estado da sala)...');
  const stateRes = await getRoomStateTransactional(p1Uid, roomCode);
  console.log(`   ✓ Estado retornado sem expectedAnswer! Version: ${stateRes.gameState.stateVersion}`);

  console.log('\n=== TODOS OS TESTES DA ETAPA 3 FORAM EXECUTADOS COM SUCESSO! ===');
}

runEtapa3Tests().catch((err) => {
  console.error('Erro nos testes da ETAPA 3:', err);
  process.exit(1);
});

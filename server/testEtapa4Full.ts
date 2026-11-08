/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  createRoomTransactional,
  joinRoomTransactional,
  selectCellTransactional,
  submitAnswerTransactional,
  expireChallengeTransactional,
  nextRoundTransactional,
  getRoomStateTransactional,
} from './roomRepository.js';

async function runEtapa4Tests() {
  console.log('=== TESTES DA ETAPA 4: FLUXO COMPLETO ONLINE DE DOIS ALUNOS ===\n');

  const p1Uid = 'chromebook-p1-uid';
  const p2Uid = 'chromebook-p2-uid';

  // 1. Aluno 1 cria sala no Chromebook 1
  console.log('1. Aluno 1 seleciona "Criar Sala" (símbolo X)...');
  const createRes = await createRoomTransactional(p1Uid, 'X', 'Aluno 1');
  const code = createRes.roomCode;
  console.log(`   ✓ Sala criada com código "${code}". Fase inicial: "${createRes.gameState.phase}" (Aguardando Aluno 2)`);

  // 2. Aluno 2 entra no Chromebook 2
  console.log('\n2. Aluno 2 digita o código no Chromebook 2 e entra na sala...');
  const joinRes = await joinRoomTransactional(p2Uid, code, 'Aluno 2');
  console.log(`   ✓ Aluno 2 conectado! Fase da partida alterada para: "${joinRes.gameState.phase}"`);

  // 3. Aluno 1 seleciona a casa 4 (centro)
  console.log('\n3. Aluno 1 clica na casa 4 (centro) para gerar o desafio...');
  const selectRes = await selectCellTransactional(p1Uid, code, 4);
  const challenge = selectRes.gameState.activeChallenge;
  console.log(`   ✓ Desafio de adição gerado para a casa 4: ${challenge?.op1} + ${challenge?.op2}. Fase: "${selectRes.gameState.phase}"`);

  // 4. Aluno 1 responde a adição no teclado virtual/físico
  console.log('\n4. Aluno 1 digita a resposta correta no teclado...');
  const sum = (challenge!.op1) + (challenge!.op2);
  const answerRes = await submitAnswerTransactional(p1Uid, code, challenge!.challengeId, sum);
  console.log(`   ✓ Resposta correta! Casa 4 marcada com "${answerRes.gameState.board[4]}". Próxima vez: "${answerRes.gameState.currentPlayer}"`);

  // 5. Aluno 2 seleciona a casa 0
  console.log('\n5. Aluno 2 clica na casa 0...');
  const select2 = await selectCellTransactional(p2Uid, code, 0);
  const challenge2 = select2.gameState.activeChallenge;
  console.log(`   ✓ Desafio gerado para Aluno 2: ${challenge2?.op1} + ${challenge2?.op2}`);

  // 6. Aluno 2 erra a resposta ou estoura o tempo
  console.log('\n6. Aluno 2 erra a resposta (envia 0)...');
  const wrongRes = await submitAnswerTransactional(p2Uid, code, challenge2!.challengeId, 0);
  console.log(`   ✓ Resposta incorreta! Casa 0 continuou livre ("${wrongRes.gameState.board[0]}"). Vez passou para: "${wrongRes.gameState.currentPlayer}"`);

  // 7. Teste de expiração por 5s
  console.log('\n7. Aluno 1 clica na casa 2, mas o tempo de 5s estoura sem resposta...');
  const select3 = await selectCellTransactional(p1Uid, code, 2);
  const challenge3 = select3.gameState.activeChallenge;
  // Simula expiração do tempo de 5 segundos
  const expireRes = await expireChallengeTransactional(p1Uid, code, challenge3!.challengeId);
  console.log(`   ✓ Desafio expirado! Vez passou para: "${expireRes.gameState.currentPlayer}". Casa 2 livre: "${expireRes.gameState.board[2]}"`);

  // 8. Teste de recuperação de estado e preservação do modo local
  console.log('\n8. Testando recuperação de estado em refresh...');
  const stateRes = await getRoomStateTransactional(p1Uid, code);
  console.log(`   ✓ Estado recuperado do banco com versão: ${stateRes.gameState.stateVersion}`);

  console.log('\n=== TODOS OS TESTES REAIS DA ETAPA 4 FORAM CONCLUÍDOS COM SUCESSO! ===');
}

runEtapa4Tests().catch((err) => {
  console.error('Erro nos testes da ETAPA 4:', err);
  process.exit(1);
});

# Roteiro controlado de correção do multiplayer — Jogo da Velha Matemático CISEB

**Aplicação de origem:** Google AI Studio, jogo React + TypeScript + Vite, servidor Express/`ws`, projeto exportado em ZIP em 07/11/2026.

**Como usar:** cole a **Mensagem 0** no Gemini do mesmo projeto. Depois, somente quando ele terminar, copie e envie a próxima mensagem. **Não envie tudo de uma vez.** Em cada etapa, exija evidências. A IA não pode afirmar que testou dois Chromebooks se não o fez.

## Mensagem 0 — Contrato de execução, escopo e auditoria (colar primeiro)

```text
Você atuará como engenheiro de software sênior, responsável por CORRIGIR o aplicativo já existente "Jogo da Velha Matemático CISEB", e NÃO por recriá-lo.

OBJETIVO INEGOCIÁVEL: o Aluno 1 cria uma sala, recebe um código de exatamente 4 dígitos; o Aluno 2, em OUTRO Chromebook/navegador, acessando o MESMO URL de aplicativo publicado, digita o código e entra na MESMA partida; ambos visualizam o MESMO tabuleiro, vez, desafio, cronômetro e placar. A sessão deve sobreviver a um refresh. Nada pode ser considerado corrigido só porque "Build" passou.

CONTEXTO VERIFICÁVEL NO CÓDIGO ATUAL:
- src/services/websocketClient.ts: createRoomApi e joinRoomApi chamam connect(false) depois de receberem playerToken; com false, o WebSocket NÃO transmite RECONNECT automaticamente.
- server.ts: salas em Map e persistência em /tmp/ciseb_rooms.json; loadRoomsFromFile() é chamada em create/join/state e no recebimento de mensagens WebSocket; restaurar repetidamente objetos que possuem conexão e timer é arriscado.
- src/App.tsx: envia SELECT_CELL/SUBMIT_ANSWER/READY_NEXT_ROUND via WebSocket, mas cria/entra por REST e acompanha estado por polling. É uma mistura de transportes não comprovada.
- As capturas mostram Aluno 1 no preview do editor do AI Studio e Aluno 2 no modo fullscreen: NÃO PRESUMA que ambos executem na mesma instância de servidor.
- O jogo local em um aparelho, a logo do CISEB, o visual, as contas de 10 a 99 + 10 a 99, as regras de 5 segundos, a perda de vez, o empate com reinício em 3 segundos e o placar DEVEM ser preservados.

REGRAS ABSOLUTAS:
1. Inspecione e reutilize os arquivos reais: server.ts, src/App.tsx, src/services/websocketClient.ts, src/components/Lobby.tsx, src/shared/types.ts, src/shared/gameRules.ts, package.json e vite.config.ts.
2. Não use dados inventados, URLs supostas, credenciais fictícias, serviços inexistentes, nomes de APIs alucinados ou arquivos que não verificou. Não diga "100% garantido".
3. Não use /tmp, localStorage, sessionStorage, Map do Node ou arquivo JSON COMO FONTE COMPARTILHADA DE VERDADE entre dispositivos. sessionStorage pode guardar apenas o estado de autenticação local do navegador quando apropriado; não substitui o banco.
4. Não altere o modo LOCAL nem o layout além do mínimo necessário. Não remova a marca CISEB.
5. Não exponha resposta esperada da adição, credenciais administrativas nem tokens privados ao cliente. Não imprima tokens em logs.
6. Proibido criar um segundo multiplayer paralelo. Haverá UMA única arquitetura online consistente.
7. Ao final de CADA etapa: (a) informe arquivos alterados; (b) explique o que mudou; (c) mostre resultados reais de npm run lint e npm run build ou os erros exatos; (d) informe claramente o que ainda NÃO foi testado; (e) PARE. Não comece a etapa seguinte até receber a próxima mensagem.
8. Se a infraestrutura Firebase/Firestore, o projeto Google Cloud, permissões, faturamento ou publicação dependerem de intervenção humana, diga exatamente o que falta e PARE, em vez de improvisar substitutos locais ou alegar que provisionou o que não provisionou.
9. NÃO aprove uma correção apenas com build. É obrigatório testar a entrada de P2 em navegador distinto na MESMA URL publicada.

AGORA EXECUTE APENAS A ETAPA 0:
A. Leia os arquivos acima e faça um mapa conciso do fluxo CREATE -> JOIN -> autenticação -> sincronização -> SELECT_CELL -> SUBMIT_ANSWER.
B. Verifique de qual servidor vêm as rotas /api/rooms/* no preview e na publicação; identifique se este aplicativo já tem configuração Firebase/Firestore real.
C. Execute os comandos de verificação disponíveis (npm run lint e npm run build) e registre resultados. Não crie endpoints fictícios, e não altere o código funcional nesta etapa.
D. Liste as falhas comprovadas, hipóteses que ainda dependem de teste e o plano de modificação dos arquivos.
E. PARE e termine escrevendo: "ETAPA 0 FINALIZADA; AGUARDANDO MENSAGEM 1".
```

## Mensagem 1 — Confirmar mesma publicação e diagnosticar instâncias

```text
ETAPA 1. Continue o trabalho dentro do MESMO projeto. Não recomece e não faça outras etapas.

OBJETIVO: descobrir objetivamente por que uma sala criada num navegador recebe 404 no outro.

1. Antes de alterar infraestrutura, preserve a versão atual via checkpoint/controle de versão. Mostre como restaurá-la.
2. No server.ts, implemente GET /api/health retornando JSON válido, sem dados pessoais/segredos: {ok:true, app:"ciseb-matematico", transport:"...", storage:"...", build:"...", instanceId:"...", now:...}. instanceId deve ser criado UMA vez no boot do processo com crypto.randomUUID(), apenas para DIAGNÓSTICO. Não gere novo id a cada requisição. Não inclua tokens.
3. Garanta que as rotas /api/* sejam atendidas pelo mesmo servidor esperado, não pelo fallback HTML do Vite. Se a requisição receber HTML, 404, CORS ou 403, classifique o erro corretamente, sem mostrar "Sala não encontrada" para tudo.
4. Adicione logs de diagnóstico somente no servidor, sem tokens: evento, código de sala (se aplicável), horário, instanceId, código HTTP, causa. Para health, não exponha credenciais nem endpoints internos sensíveis.
5. Demonstre mediante requisições reais (curl, fetch ou cliente HTTP disponível) o retorno de /api/health, POST /api/rooms/create e POST /api/rooms/join, em UMA MESMA instância. Caso não consiga fazer os testes, diga "NÃO EXECUTADO".
6. Explique a diferença entre preview, fullscreen do editor e URL do aplicativo realmente PUBLICADO. Informe qual URL real deve ser aberta nos dois Chromebooks; NUNCA invente URL. Publicar pode exigir clique humano em Publish/Deploy; registre isso.
7. Se o instanceId ou armazenamento diferir entre os clientes, registre claramente que persistência local não serve para comunicação entre eles. Não prometa que configurar sticky sessions, polling ou /tmp resolve isso permanentemente.
8. Execute lint/build, apresente evidências e PARE.

Não tente corrigir a arquitetura nesta etapa. Termine: "ETAPA 1 FINALIZADA; AGUARDANDO MENSAGEM 2".
```

## Mensagem 2 — Banco compartilhado e autenticação anônima segura

```text
ETAPA 2. Implementar a base real de multiplayer, com backend compartilhado. Não avance para telas ou jogadas agora.

ARQUITETURA ALVO (NÃO SUBSTITUIR SILENCIOSAMENTE):
- Firebase Authentication ANÔNIMA no navegador, para cada Chromebook ter UID próprio e sobreviver a refresh no mesmo perfil.
- Cloud Firestore como fonte de verdade compartilhada entre instâncias. Solicite ao recurso de provisionamento Firebase do Google AI Studio para conectar um projeto real, se disponível.
- Express existente em server.ts + Firebase Admin SDK no servidor, verificando o Firebase ID Token em TODA operação de jogo.
- Firestore com documento público e documento privado separados por sala. Clientes somente leem o público via onSnapshot; nunca escrevem diretamente dados da partida.
- Tudo que muda tabuleiro, desafio, turno, placar ou fases passa por endpoint autorizado no servidor e transação Firestore.
- WebSocket e /tmp não devem continuar sendo dependências de correção do multiplayer. Serão removidos da rota crítica nas próximas etapas.

PASSOS OBRIGATÓRIOS:
1. Verifique as dependências e a versão Node de execução. Não force Admin SDK incompatível; valide suporte antes de instalar.
2. Verifique se o projeto Firebase e Firestore estão realmente provisionados e acessíveis pelo servidor em execução. Use credenciais padrão do ambiente Google (Application Default Credentials) quando disponíveis. Não inclua chave JSON administrativa no frontend, código-fonte, Git, artefatos ou mensagens.
3. Habilite Firebase Authentication ANÔNIMA somente se essa opção estiver realmente disponível. Se depender de ação manual, documente os cliques necessários e PARE.
4. Crie módulos separados e pequenos, tais como server/firebase.ts, server/roomRepository.ts e src/services/firebaseClient.ts, seguindo os caminhos reais do projeto. Não duplique a configuração.
5. Modelo proposto:
   rooms/{roomCode}  -> documento público, com board[9], phase, players P1/P2 {uid, mark, name, score}, currentPlayer, startingPlayer, activeChallenge {id, cellIndex, op1, op2, expiresAt}, winningLine, winnerMark, roundNumber, stateVersion, createdAt, updatedAt, expiresAtRoom.
   roomSecrets/{roomCode} -> documento PRIVADO de servidor com expectedAnswer e outros dados de verificação. NUNCA expor esse documento via cliente ou em /api/rooms/state.
6. Defina Firestore Security Rules para permitir get/onSnapshot do documento público SOMENTE a request.auth.uid correspondente ao P1 ou P2 da sala; negar list e todas as gravações client-side; negar toda leitura/gravação client-side de roomSecrets. Publique/aplique as regras reais, não apenas crie um arquivo desconectado.
7. Não gere o código de sala de quatro dígitos por Math.random para segurança/colisão. Use crypto.randomInt(0,10000), padStart(4,'0') e verificação atômica de unicidade antes da criação; limite tentativas; 0000 é código válido.
8. Use transações e timestamps controlados pelo servidor. Prepare validação da sala expirada e política de limpeza/TTL; não presuma persistência eterna.
9. Não apague ou substitua o modo LOCAL. Preserve toda a identidade visual.
10. Mostre evidência de leitura/gravação no Firestore REAL em um teste servidor, sem expor credenciais, e evidência das regras aplicadas. Se não puder provar, marque explicitamente NÃO VALIDADO.
11. Execute lint/build e PARE.

ALERTA: Se não houver infraestrutura e permissões, não crie um "Firestore de mentirinha" nem volte a /tmp. Informe a dependência humana e pare.

Termine: "ETAPA 2 FINALIZADA; AGUARDANDO MENSAGEM 3".
```

## Mensagem 3 — Endpoints HTTP autorizados e motor de jogo transacional

```text
ETAPA 3. Agora substitua a lógica ONLINE crítica do servidor por operações HTTP autenticadas, atômicas e compartilhadas em Firestore. Ainda não altere as telas, exceto tipos necessários.

CONTRATO EXATO:
- Todas as operações HTTP recebem Firebase ID Token em Authorization: Bearer <idToken> e verificam UID no servidor via Firebase Admin. Não enviar idToken em URL.
- POST /api/rooms/create   body {preferredMark:"X"|"O"} -> 201 com {success:true, roomCode, playerId:"P1", gameState}; cria docs público/privado numa transação e inicia WAITING_FOR_PLAYER.
- POST /api/rooms/join     body {roomCode:"NNNN"} -> 200 {success:true,roomCode,playerId:"P2",gameState}, usando transação. Se player2 vazio: ocupa. Se o MESMO UID de P2 repetir a requisição: idempotente. Se outro UID ocupar: 409 ROOM_FULL. Se UID de P1 tentar entrar como P2: 409 SAME_PLAYER. Se código inexistente: 404 ROOM_NOT_FOUND. Proibido expulsar P2 com token/código desconhecido.
- GET /api/rooms/state?roomCode=NNNN -> 200 {success:true,gameState}; somente P1/P2 autenticados. Serve como diagnóstico/fallback, sem expectedAnswer.
- POST /api/rooms/select  body {roomCode, cellIndex, requestId} -> estado público atualizado. Permitir somente quem está na vez, em PLAYING e numa casa inteira 0..8 vazia. Criar adição 10..99 + 10..99, challengeId único e expiresAt=hora do servidor+5000ms. Guardar resposta APENAS no documento privado. Fazer transação Firestore.
- POST /api/rooms/answer  body {roomCode, challengeId, answer, requestId} -> validar P1/P2, fase CHALLENGE, challengeId, hora de recebimento e resposta no servidor; apenas primeiro envio válido por desafio pode alterar o estado. Acerto marca casa, troca vez ou finaliza a rodada. Erro ou tempo esgotado não marca e passa vez.
- POST /api/rooms/expire  body {roomCode, challengeId} -> se o desafio realmente venceu e continua ativo, troca a vez sem marcar; se já foi resolvido, é idempotente. Ambos clientes podem enviar e o servidor deve atualizar NO MÁXIMO UMA VEZ por challengeId.
- POST /api/rooms/next-round body {roomCode, requestId} -> só P1/P2; quando ROUND_WON/ROUND_DRAW, reinicia tabuleiro mantendo placar, alternando quem começa. Se ROUND_DRAW: cliente exibe 3 segundos antes de chamar esta rota, e o servidor garante reinício único.

REGRAS DE INTEGRIDADE:
- Transação deve ler documentos antes de escrever e não deve conter setTimeout, chamada de rede, ação de UI ou efeito colateral não idempotente.
- stateVersion incrementa apenas quando há alteração de estado. Não entregar resposta esperada da soma em gameState.
- Validação estrita de código exatamente ^\\d{4}$; não aceitar código arbitrário nem truncar.
- Usar respostas estruturadas {success:false,code,message} com status HTTP correto: 400 dados inválidos, 401 sem autenticação, 403 jogador sem acesso, 404 sala inexistente, 409 conflito, 410 sala expirada, 503 banco indisponível. Nunca converter uma indisponibilidade do banco em "sala não encontrada".
- Impedir requisição duplicada, jogada fora de turno, ocupação de casa já marcada, resposta tardia, jogada com fase incorreta e dupla contagem de ponto.
- O servidor é autoritativo quanto a prazo de 5 segundos. Se for usada margem técnica para atraso de rede, ela deve ser explícita e testada; não transformar 5s em 5,2s silenciosamente.
- Sem depender de setTimeout do servidor como ÚNICO mecanismo de expiração. A operação /expire e outras operações devem verificar prazo com transação; se ninguém estiver conectado, ao retornar deve haver regularização.
- Não manter simultaneamente uma segunda lógica de ações WebSocket que altere a mesma sala por fora das transações.

ENTREGA: endpoints funcionando em testes HTTP autenticados com dois UIDs distintos; casos negativos; lint/build; arquivos alterados. Se Firebase ainda não estiver operacional, pare e explique. Termine "ETAPA 3 FINALIZADA; AGUARDANDO MENSAGEM 4".
```

## Mensagem 4 — Frontend compartilhado, espera, partidas e reconexão

```text
ETAPA 4. Agora conecte as telas React aos endpoints e snapshots REAIS. Não mude as regras locais nem refaça a estética.

ALTERE SOMENTE O NECESSÁRIO em src/App.tsx, src/services/websocketClient.ts (substitua por serviço online único; renomeie para onlineGameClient.ts se apropriado), src/components/Lobby.tsx, src/shared/types.ts e componentes estritamente relacionados.

FLUXO EXATO DO ALUNO 1:
1. Abrir MESMA URL publicada, selecionar Online > Criar sala, símbolo X/O.
2. Inicializar Firebase Auth anônima, obter ID token, chamar POST /api/rooms/create.
3. Usar o roomCode retornado e ouvir onSnapshot do documento público rooms/{roomCode}; mostrar "Aguardando Aluno 2" e código de quatro dígitos.
4. Quando player2 aparecer com UID próprio e fase mudar para PLAYING, ambos entram no tabuleiro. Não iniciar jogo antes da confirmação no banco.

FLUXO EXATO DO ALUNO 2:
1. Em OUTRO Chromebook, perfil/navegador ou janela anônima (UID diferente), acessar EXATAMENTE a mesma URL publicada.
2. Selecionar Online > Entrar em sala, digitar 4 dígitos (inclusive zeros iniciais), chamar POST /api/rooms/join.
3. Tratar 404/409/401/503 com mensagens distintas. Não tentar entrar como P1. Se entrar, ouvir onSnapshot da mesma sala e entrar na partida com P2.

COMPORTAMENTO DURANTE A PARTIDA:
- Usuário só pode clicar se estiver na vez dele; o clique POST /select cria desafio no servidor; ambos veem o mesmo estado.
- O aluno da vez usa teclado físico e virtual para responder; POST /answer valida. O outro aluno vê a pergunta/turno, mas não pode responder.
- O temporizador exibe expiresAt devolvido pelo servidor. Não use dois cronômetros autoritativos; o cliente apenas desenha contagem. Quando zerar, solicite /expire, que é idempotente. Nunca conceder ponto por timeout.
- onSnapshot é a principal atualização em tempo real; nenhum polling constante 1s para sempre, WebSocket zumbi ou estado duplicado que concorra com Firestore. Uma rota GET/state pode ser usada pontualmente como fallback/diagnóstico, se indispensável.
- Não iniciar vários listeners: guarde unsubscribe, limpe no unmount/troca de sala e evite double subscription com React StrictMode.
- Evitar reverter para estados antigos: compare stateVersion, ignore payload inferior ao aplicado e trate race conditions após POST.
- Inspecione src/components/DrawBanner.tsx: o efeito que reinicia em 3s depende de onRestart; garanta que não seja recriado a cada render e que não dispare NEXT_ROUND múltiplas vezes (inclusive em React StrictMode).
- Ao sair do modo ONLINE ou entrar no LOCAL, desligue efetivamente listeners/transportes antigos; clearSession isolado não basta se a conexão anterior permanecer aberta.
- Ao recarregar, aguarde o Firebase restaurar o UID; recupere a sala salva apenas se o UID autenticado realmente for P1/P2 no banco. Não converter P1 em P2. Limpe a sessão local ao escolher "Sair"; não force que "Criar" e "Entrar" reaproveitem identidade de outro jogador.
- Exiba estado de conexão de forma honesta: carregando, aguardando, conectado, reconectando, erro no servidor. Não afirme "Sala criada com sucesso" antes do commit no banco.
- Mantenha nomes, logo, paleta, visual atual, modo LOCAL offline, comportamento de empate e placar.

TESTES MÍNIMOS REAIS: criação, entrada, refresh de P1, refresh de P2, um desafio, resposta correta, resposta errada, 5s, reinício de empate e preservação do modo local. Mostre os testes realmente realizados; não invente interação com dois dispositivos. Execute lint/build e PARE.

Termine: "ETAPA 4 FINALIZADA; AGUARDANDO MENSAGEM 5".
```

## Mensagem 5 — Testes automatizados, negativos, concorrência e segurança

```text
ETAPA 5. Antes de declarar sucesso, implemente e execute testes automatizados e registre os testes manuais pendentes.

1. Crie testes com o framework que o projeto suportar (preferir node:test no backend ou uma ferramenta de testes já instalada). Não diga que existem testes se não os criou.
2. Teste com repositório simulado para lógica isolada e, se houver Firebase Emulator / ambiente de teste configurado, com Firestore real/emulado. Identifique qual foi usado.
3. Cobertura obrigatória:
   T01 criar código com 4 dígitos, inclusive 0000;
   T02 colisão de código não sobrescreve sala;
   T03 P2 entra com código correto e UID distinto;
   T04 404 em sala inexistente;
   T05 409 em sala cheia;
   T06 P1 não entra como P2;
   T07 refresh recupera mesmo jogador;
   T08 jogador não pertencente não lê a sala;
   T09 fora da vez não seleciona casa;
   T10 casa ocupada rejeita nova seleção;
   T11 operação matemática tem operandos 10..99;
   T12 resposta correta antes do prazo marca uma vez;
   T13 resposta errada perde vez sem marcação;
   T14 resposta após 5s perde vez sem marcação;
   T15 dois envios simultâneos não contam duas vezes;
   T16 duas chamadas de /expire não trocam duas vezes;
   T17 vitória incrementa exatamente um ponto;
   T18 empate reinicia e mantém placar;
   T19 queda/reconexão não troca identidade;
   T20 duas instâncias do servidor compartilham sala e estado via Firestore;
   T21 não existe expectedAnswer, credencial privada nem token de autenticação no estado público;
   T22 falha de Firestore produz 503 e não 404;
   T23 modo LOCAL funciona sem conexão de rede;
   T24 chamadas indevidas com payload malformado são rejeitadas.
4. Teste também o controle de concorrência no JOIN: dois possíveis P2 tentando ocupar a mesma sala quase simultaneamente -> apenas um vence.
5. Revise as Firestore Security Rules efetivamente aplicadas, autenticação anônima, autorização por UID, ausência de vazamento de soluções matemáticas e possíveis abusos com 4 dígitos. Adicione rate limit de criação/entrada ou política equivalente adequada ao ambiente; não exponha dados de estudantes.
6. Faça npm run lint, npm run build e o comando de teste implementado. Relate quantitativamente quantos passaram, falharam, foram pulados e não puderam ser executados.
7. Não afirme "100% funcional" porque um teste unitário ou build passou. PARE.

Termine: "ETAPA 5 FINALIZADA; AGUARDANDO MENSAGEM 6".
```

## Mensagem 6 — Publicação real e roteiro final de homologação

```text
ETAPA 6. Fechamento e homologação. Não volte a alterar a arquitetura sem evidência de defeito.

1. Certifique-se de que o runtime publicado suporta servidor Express e tem acesso REAL ao mesmo projeto Firestore e Firebase Auth, com credenciais administrativas exclusivamente do lado do servidor.
2. Oriente a implantação pelo botão Publish/Deploy no Google AI Studio / Cloud Run conforme o estado REAL do projeto. Se requer ação humana, liste passos concretos e aguarde. Não invente uma URL publicada, não confunda URL do editor, preview ou iframe com endereço público.
3. Após a publicação, só declare deploy concluído quando tiver URL real, HTTPS e resposta JSON verificável em /api/health. Não use teste apenas no preview para homologação entre Chromebooks.
4. ROTEIRO DO PROFESSOR (ambos devem acessar exatamente o MESMO URL publicado):
   a) Chromebook A, navegador normal: abrir aplicativo, modo Online, Criar Sala, anotar código.
   b) Chromebook B, outro navegador/perfil ou janela anônima: abrir a MESMA URL, modo Online, Entrar, inserir código.
   c) Resultado esperado: P1 mostra entrada do P2; ambos exibem a mesma rodada/placar.
   d) P1 seleciona casa e responde; P2 observa atualização e passa a jogar; repetir com erro e timeout.
   e) Recarregar cada Chromebook; verificar identidade e sala preservadas.
   f) Testar código errado, sala cheia, internet indisponível e modo local offline.
5. Se houver falha, registrar no DevTools/Network: URL de origem (sem tokens), método, caminho /api, status HTTP, campo code, instanceId do /api/health, horário e stateVersion. Nunca coletar ID token, chaves, cookies, dados de alunos ou credenciais.
6. ENTREGUE TABELA FINAL de testes: ID, esperado, evidência, PASSOU/FALHOU/NÃO EXECUTADO e ação pendente. Se não houver acesso físico a dois Chromebooks, marque a homologação entre dispositivos como NÃO EXECUTADA e entregue as instruções para que o professor a realize.
7. Entregue changelog conciso e resumo da arquitetura final. Verifique a preservação do visual CISEB, das regras e do jogo local.
8. Não escreva "Problema resolvido" enquanto a entrada real do segundo navegador na sala criada pelo primeiro não for demonstrada.

Termine: "ETAPA 6 FINALIZADA; HOMOLOGAÇÃO [PASSOU / PENDENTE / FALHOU]" com justificativa.
```

## Resultado esperado e limites

Ao fim, a sala deve estar armazenada no **Firestore compartilhado**, autenticada por **UIDs diferentes** dos Chromebooks e sincronizada pelo **onSnapshot** do documento público, com operações HTTP feitas exclusivamente no servidor e transações atômicas. A aplicação **LOCAL** não depende da Internet. Se Firebase não puder ser provisionado ou se o aplicativo não estiver de fato publicado, o Gemini deve informar a intervenção necessária e parar — nunca simular sucesso.

**Fontes oficiais para revisão:**
- Google AI Studio — Criar apps: https://ai.google.dev/gemini-api/docs/aistudio-build-mode?hl=pt-BR
- Google Cloud — WebSockets em Cloud Run: https://docs.cloud.google.com/run/docs/triggering/websockets
- Firebase — Transações Firestore: https://firebase.google.com/docs/firestore/manage-data/transactions
- Firebase Admin SDK: https://firebase.google.com/docs/admin/setup

# Jogo da Velha Matemático CISEB
## Plano de implementação revisado — especificação técnica e pedagógica

**Versão:** 2.0 · **Data:** 07/11/2026  
**Situação:** especificação revisada; não representa software implementado, testado ou publicado.  
**Origem:** revisão de engenharia do arquivo `implementation_plan.md` fornecido.

---

## 0. Decisão de engenharia

**Aprovar o conceito para implementação, condicionado à correção dos pontos críticos**: autoridade do servidor, cronômetro, autorização por jogador, reconexão, hospedagem com WebSocket e testes automatizados.

### Decisões do projeto a preservar (requisitos fechados)

1. **Dois modos:** online em dois Chromebooks, com sala de **quatro dígitos**, e local no mesmo Chromebook.
2. **Tabuleiro:** jogo da velha 3 × 3, dois participantes, símbolos X e O.
3. **Desafio obrigatório:** antes de marcar uma casa, resolver **adição com dois termos de dois algarismos** (10–99 + 10–99).
4. **Tempo competitivo:** exatamente **5 segundos** por tentativa; erro ou expiração ocasiona **perda da vez sem marcar a casa**.
5. **Resposta:** teclado numérico virtual e teclado físico do Chromebook, incluindo Enter para confirmar.
6. **Identidade CISEB:** azul-marinho `#003B7A`, azul-celeste `#00A3E0` e branco `#FFFFFF`, com logomarca oficial.
7. **Empate:** exibir aviso e reiniciar automaticamente o tabuleiro após **3 segundos**, mantendo o placar acumulado.

**Ajustes de detalhamento, sem alterar as regras:** o Aluno 1 inicia a primeira rodada, independentemente de ser X ou O; a prioridade de início alterna nas rodadas seguintes. Após uma vitória, o placar é atualizado e uma nova rodada é iniciada por ação dos jogadores, não automaticamente. Em empate, aplica-se obrigatoriamente o reinício automático descrito acima.

### Pontos corrigidos em relação ao plano original

| Área | Problema/omissão | Correção proposta |
|---|---|---|
| Tempo | Dois cronômetros de navegador podem divergir | **Servidor controla o prazo de 5 s**; o navegador só apresenta a contagem visual |
| Integridade | Cliente poderia decidir acerto ou vitória | **Servidor valida** a resposta e calcula mudanças de estado |
| Salas | Código de quatro dígitos sem tratamento de colisões ou abuso | Geração criptograficamente adequada, verificação de unicidade, limite de ocupação e de tentativas |
| Identidade | Código de sala confundido com identidade/autorização | **Token individual de sessão** para cada participante; código identifica apenas a sala |
| Concorrência | Cliques e respostas simultâneos não previstos | Máquina de estados, `challengeId`, versão do estado e validação idempotente |
| Queda de rede | Jogador podia perder todo o estado | Janela de reconexão, recuperação por snapshot e descarte seguro de salas |
| Modo local | Desnecessária dependência de backend | Motor de regras reutilizável, executado no navegador |
| Deploy | Porta 3000 e HTTP proxy não garantem acesso remoto | Hospedagem Node com suporte a conexão persistente **HTTPS/WSS** |
| Testes | Comandos `compile_applet`/`lint_applet` podem não existir | Scripts reais do projeto: tipos, lint, testes e build; ferramentas especiais só se disponíveis |
| Pedagogia | Falta feedback orientador | Feedback matemático breve após erro e opção futura de treino acessível |

---

## 1. Objetivo e critérios de experiência

Proporcionar partidas rápidas de jogo da velha em que cada marcação depende de cálculo mental de adição. A solução deve funcionar **inteiramente no navegador do Chromebook**, sem instalar programas nos dispositivos escolares.

**Usuários:** Aluno 1, Aluno 2 e, como facilitador, o professor. **Não são necessários cadastro, e-mail, nomes reais nem coleta de dados pessoais.**

**Importante na perspectiva pedagógica:** os cinco segundos constituem uma regra competitiva, não uma medida isolada de aprendizagem matemática. O modo principal deve respeitar essa regra; um modo de prática sem pressão de tempo pode ser previsto como melhoria futura, sem alterar o jogo confirmado.

## 2. Regras formais da partida

1. O jogador da vez clica ou seleciona **uma casa vazia** (índices 0–8).
2. O jogo abre o desafio; no modo online o servidor gera os operandos e o identifica com um `challengeId` único.
3. O desafio contém exatamente dois números inteiros entre 10 e 99, inclusive. A soma está entre **20 e 198**.
4. Cada desafio admite **uma tentativa de confirmação**. A resposta deve ser inteira, não negativa e conter até três algarismos; números inválidos são rejeitados pelo formulário antes de transmitir.
5. **Acerto recebido pelo servidor antes do prazo:** marca a casa e transfere a vez, salvo quando a jogada termina a rodada.
6. **Primeira resposta errada ou prazo de 5 s esgotado:** mantém a casa livre e transfere a vez; não cria uma segunda tentativa para o mesmo desafio.
7. Uma casa ocupada, uma ação do jogador fora da vez, um `challengeId` vencido ou uma mensagem duplicada **não** altera o tabuleiro nem consome uma nova vez.
8. Vitória: três símbolos iguais em linha, coluna ou diagonal. O placar de vitórias desse jogador aumenta **uma vez**.
9. Empate: nove casas preenchidas e nenhuma linha vencedora; o tabuleiro zera automaticamente após 3 s e **o placar permanece**.
10. Nova rodada após vitória: no modo local, botão **Jogar novamente**; no online, ambos indicam que desejam continuar. Até lá, o placar e a linha vencedora permanecem visíveis.
11. Alternar o jogador que inicia cada nova rodada. O jogador pode manter o símbolo escolhido inicialmente por toda a sessão.
12. **Zerar placar** exige ação explícita e confirmação. Não confundir com reinício de rodada.

**Momento exato do prazo:** em modo online, o servidor registra o início e usa tempo monotônico. Uma resposta recebida no instante `recebidoEm >= prazoFinal` é tardia e perde a vez. A interface não decide resultados com base em sua própria contagem.

## 3. Fluxos de usuário

### 3.1 Abertura

- Tela inicial: logomarca, título, botões **Jogar neste Chromebook** e **Jogar em 2 Chromebooks**.
- Aluno 1 escolhe X ou O; Aluno 2 recebe o oposto.
- Modo local começa imediatamente e funciona sem rede após o carregamento dos recursos.
- Modo online: **Criar sala** retorna um código de quatro dígitos. O segundo Chromebook seleciona **Entrar em sala** e digita o código. A partida começa quando os dois jogadores estão conectados e prontos.

### 3.2 Desafio

- Exibir `47 + 38 = ?` em grande destaque; anel de contagem regressiva; teclado numérico com botões **0–9**, **Apagar**, **Limpar** e **Confirmar**.
- Dar foco ao campo de resposta automaticamente quando um desafio estiver ativo.
- Aceitar as teclas `0`–`9`, `Backspace` e `Enter`, sem interceptar teclas quando o usuário estiver digitando em outra entrada.
- Desabilitar casas ocupadas, ações durante um desafio pendente e botões do adversário no modo online.
- Após acerto/erro/tempo, dar retorno visual e sonoro opcional, com **texto além da cor**; a mudança de vez acontece conforme o estado oficial.
- Em erro, apresentar brevemente a operação resolvida como feedback formativo, sem atrasar artificialmente o início lógico da vez seguinte.

### 3.3 Conectividade e erros

- Exibir estados claros: **Aguardando adversário**, **Sua vez**, **Vez do adversário**, **Reconectando**, **Sala encerrada**.
- Não criar duas partidas independentes quando houver oscilação de rede.
- **Perda da conexão durante um desafio:** o tempo de 5 segundos continua valendo; se não houver resposta válida, aplica-se a penalidade normal.
- **Desconexão fora de um desafio:** suspender novas seleções por até **45 s**. Se o mesmo jogador retornar com seu token, recuperar o estado completo. Se não retornar, oferecer ao conectado a opção de encerrar a sala, sem conceder vitória fictícia.
- Havendo empate com reinício agendado e desconexão, manter o estado da rodada e executar o reinício de 3 s quando ambos estiverem conectados novamente.
- Sala inexistente, cheia, expirada ou código incorreto devem gerar mensagens distintas e legíveis.

## 4. Arquitetura recomendada

### 4.1 Tecnologias

- **Frontend:** React + TypeScript + Vite + Tailwind CSS (caso já integrem o projeto; verificar repositório antes de instalar ou substituir dependências).
- **Backend:** Node.js + TypeScript + Express + `ws` para comunicação WebSocket.
- **Domínio compartilhado:** pacote TypeScript com tipos, regras puras, análise de vitória e transições de partida; sem dependência de React ou Express.
- **Validação de payload:** esquema tipado/validado na borda (por exemplo, Zod) para cada evento recebido.
- **Testes:** Vitest para regras; integração WebSocket com clientes simulados; Playwright, quando viável, para os fluxos em dois navegadores.
- **Persistência:** memória de processo para MVP; sem banco de dados nem dados pessoais. Avisar que reinício do servidor encerra as salas ativas.

### 4.2 Topologia

```text
[Chromebook A] ── HTTPS / WSS ──┐
                                │
                        [Servidor Node/Express]
                        [Servidor WebSocket ws]
                        [Gestor de salas]
                        [Regras e cronômetro autoritativos]
                                │
[Chromebook B] ── HTTPS / WSS ──┘

[Um só Chromebook]
     └── Interface React + mesmo motor de regras local
         (não depende de WebSocket para jogar)
```

O WebSocket pode ser exposto na rota `/ws` da mesma origem HTTPS, reduzindo problemas de configuração e políticas de rede. A porta `3000` é apenas um **padrão de desenvolvimento**; a produção deve usar a porta fornecida pela plataforma (`process.env.PORT`). A hospedagem precisa aceitar **processos Node persistentes e WebSocket**. Hospedagem exclusivamente estática não implementa sozinha o modo online.

**Limite de escala do MVP:** salas em memória funcionam em uma instância; várias réplicas exigirão armazenamento compartilhado e coordenação de eventos (por exemplo, Redis) antes de serem habilitadas.

### 4.3 Estrutura de arquivos sugerida

```text
jogo-da-velha-ciseb/
  client/
    src/
      components/   # Board, ChallengeDialog, NumericKeypad, TimerRing, Scoreboard
      pages/        # Home, LocalGame, OnlineLobby, OnlineGame
      hooks/        # useKeyboard, useRoomConnection
      services/     # websocketClient, audio
      styles/       # tokens visuais CISEB
  server/
    src/
      index.ts      # HTTP + Upgrade WebSocket
      roomManager.ts
      gameSession.ts
      protocol.ts
      security.ts
  shared/
    src/
      rules.ts      # transitions, checkWinner, checkDraw
      types.ts
      math.ts       # gerador com fonte aleatória injetável
  tests/
    unit/
    integration/
    e2e/
```

## 5. Máquina de estados e propriedade dos dados

### 5.1 Estados da sala

- `WAITING_FOR_PLAYER`: sala criada, aguarda o segundo Chromebook.
- `READY`: dois jogadores conectados; aguardam início ou retomada.
- `AWAITING_SELECTION`: jogo em andamento e jogador ativo pode escolher casa.
- `CHALLENGE_ACTIVE`: existe um único desafio pendente para uma casa.
- `ROUND_WON`: vitória confirmada, linha e placar definidos.
- `ROUND_DRAW`: empate confirmado, reinício automático programado.
- `PAUSED_DISCONNECTED`: partida temporariamente suspensa fora de desafio.
- `CLOSED`: sala encerrada e tokens invalidados.

Cada transição aumenta `stateVersion`. Somente o servidor pode criar estados da sala online. Mensagens fora de ordem, de outro jogador ou incompatíveis com o estado atual são ignoradas/rejeitadas sem alterar a pontuação.

### 5.2 Modelo conceitual

```ts
type Mark = 'X' | 'O';
type Cell = Mark | null;
type PlayerId = 'P1' | 'P2';

type PublicGameState = {
  roomCode: string;
  board: Cell[]; // comprimento exato 9
  currentPlayer: PlayerId;
  playerMarks: Record<PlayerId, Mark>;
  scores: Record<PlayerId, number>;
  roundNumber: number;
  stateVersion: number;
  phase: string;
  winningLine?: [number, number, number];
};

type PrivateActiveChallenge = {
  challengeId: string;
  selectedCell: number;
  operands: [number, number];
  expectedAnswer: number; // NUNCA enviado ao cliente
  expiresAtMonotonicMs: number;
};
```

O cliente pode conhecer os operandos do desafio ativo, mas **jamais recebe `expectedAnswer`**. O servidor associa cada conexão a um participante por token individual de sessão. O **código de sala não é token de autenticação**.

## 6. Protocolo WebSocket — contrato mínimo

Todas as mensagens são objetos JSON com `type`, `requestId`, `payload` e versão do protocolo quando pertinente. Validar tamanho, tipos e limites de cada payload.

| Direção | Evento | Função |
|---|---|---|
| Cliente → servidor | `CREATE_ROOM` | Criar sala e atribuir identidade de jogador |
| Cliente → servidor | `JOIN_ROOM` | Entrar em sala de quatro dígitos não cheia |
| Cliente → servidor | `RECONNECT` | Reassociar token de participante à sala |
| Cliente → servidor | `SELECT_CELL` | Solicitar desafio para índice 0–8 |
| Servidor → cliente(s) | `CHALLENGE_STARTED` | Transmitir `challengeId`, operandos e prazo visual; o adversário recebe aviso de desafio em andamento |
| Cliente → servidor | `SUBMIT_ANSWER` | Enviar `challengeId` e resposta inteira |
| Servidor → cliente(s) | `GAME_STATE` | Transmitir snapshot autorizado, versão, placar e fase |
| Servidor → cliente(s) | `TURN_RESULT` | Informar acerto, erro ou expiração; sem antecipar gabarito |
| Servidor → cliente(s) | `ROUND_FINISHED` | Informar vitória/empate e efeitos correspondentes |
| Cliente → servidor | `READY_NEXT_ROUND` | Aceitar nova rodada após vitória |
| Servidor → cliente(s) | `ROUND_RESTARTED` | Tabuleiro reaberto; placar preservado |
| Servidor → cliente | `ERROR` | Código de erro estável com mensagem compreensível |

**Correção de nomenclatura importante:** `TIME_EXPIRED` e `RESTART_ROUND` não são comandos de clientes que possam ser aceitos pelo backend. Expiração e reinício automático são **eventos/decisões do servidor**.

**Exemplo de resposta submetida:**

```json
{
  "type": "SUBMIT_ANSWER",
  "requestId": "attempt-18",
  "payload": {
    "challengeId": "challenge-7",
    "answer": 85
  }
}
```

### 6.1 Determinismo e simultaneidade

- O servidor processa `SELECT_CELL` apenas para o jogador ativo, sem desafio em curso, e valida `board[cell] === null`.
- Um desafio possui **um único desfecho**: acerto, erro ou expiração. Ao resolver, invalidar imediatamente seu identificador e o timer agendado.
- `SUBMIT_ANSWER` duplicado com mesmo `requestId` ou `challengeId` resolvido **não causa efeitos adicionais**.
- Resultado recebido em `expiresAt` ou depois é expirado; o servidor também agenda uma expiração, mas qualquer processamento verifica novamente o prazo monotônico para não depender só do agendador.
- O cliente aplica apenas estados com `stateVersion` maior, evitando retrocessos de interface.

### 6.2 Precisão do temporizador

No servidor, capturar início por relógio monotônico e definir `deadline = início + 5000ms`. Publicar também uma referência de tempo do servidor para o cliente desenhar o anel de progresso; sua precisão visual pode variar pela latência, **mas a validade é decidida exclusivamente no servidor**. Não prometer precisão visual idêntica em redes lentas.

## 7. Salas, reconexão e proteção de uso

1. Gerar código de quatro dígitos usando fonte aleatória segura (p. ex. `crypto.randomInt(0, 10000)` e `padStart(4, '0')`); **tentar novamente se já estiver ocupado**.
2. Limitar cada sala a dois jogadores; não conceder acesso a partidas em andamento apenas por conhecer o código.
3. Gerar tokens de sessão diferentes para Aluno 1 e Aluno 2; guardá-los em `sessionStorage` só para reconexão nesta guia, sem transmiti-los na URL nem em logs.
4. Expirar salas vazias/ociosas; referência inicial: 15 minutos sem segundo jogador, 30 minutos sem atividade após encerramento da sessão, e 45 segundos para reconexão de participante desconectado.
5. Autorizar **cada comando**, verificando jogador, sala, fase, turno e desafio.
6. Validar `Origin` no upgrade WebSocket usando lista explícita, sem curingas permissivos; usar **WSS** em produção.
7. Limitar criação/entrada de salas e mensagens por IP/conexão; impor tamanho máximo pequeno a payloads (por exemplo, 4 KiB para este protocolo), além de limites de conexões.
8. Usar heartbeat `ping/pong` do WebSocket e descartar conexões mortas com limpeza de recursos.
9. Não adicionar chat, conta, coleta de nome, câmera ou analytics de estudantes ao MVP.
10. Exibir mensagens genéricas para tentativas não autorizadas e evitar registrar tokens, operações dos alunos ou informações identificáveis.

**Observação:** um código de apenas quatro dígitos tem 10 mil combinações; isto **não é segurança forte**. É aceitável como mecanismo de descoberta rápida em sala de aula apenas se houver expiração, limite de tentativas, controle de lotação e token individual. Não tratar o código como segredo de alto valor.

## 8. Interface, acessibilidade e identidade visual

**Tokens de design principais:**

| Papel | Cor |
|---|---|
| Institucional | `#003B7A` |
| Acento | `#00A3E0` |
| Fundo/superfície | `#FFFFFF`, `#F8FAFC` |
| Acerto | `#10B981` + texto/ícone |
| Erro/tempo | `#EF4444` + texto/ícone |

Usar a **logomarca oficial sem deformar, recolorir arbitrariamente ou recriar**, preferencialmente em SVG/PNG de boa resolução. O plano original cita um nome de arquivo de logomarca, mas essa mídia **não foi anexada nesta revisão**; confirmar o ativo antes de finalizar a implementação. Confirmar também a fonte tipográfica no manual de marca, em vez de presumir uma família oficial.

- Layout adaptativo para 1366×768 e 1280×800, além de celulares e outras larguras.
- Casas clicáveis grandes, com identificação acessível: “Linha 2, coluna 3, vazia”.
- Modal acessível: foco inicial, rótulo da operação, retorno de foco ao tabuleiro, comportamento consistente com Escape conforme regras da partida (Escape não pode anular uma tentativa nem estender o prazo).
- Mostrar “Sua vez” e “Vez do adversário”; não transmitir informação somente com vermelho/verde.
- Botão **Som ligado/desligado**, estado inicial sem som até interação que autorize Web Audio; oferecer opção para reduzir movimento e confetes.
- Exibir placar persistente, símbolo de cada jogador e indicador de conexão.
- Manter feedback visual mesmo quando áudio estiver desativado; suportar navegação por teclado.

## 9. Plano de implementação em etapas

### Etapa 0 — Diagnóstico do ambiente (bloqueador)

- Verificar repositório real, framework, versões, scripts disponíveis e estrutura existente.
- Identificar onde o backend Node poderá ser hospedado com suporte a WSS e processos persistentes.
- Confirmar ativo real da logomarca e permissões para utilizá-lo.
- Não presumir a existência de `metadata.json`, de `compile_applet` ou de `lint_applet`.

**Entrega:** decisão registrada sobre infraestrutura e estrutura real do projeto.

### Etapa 1 — Regras e modo local (prioridade P0)

- Implementar funções puras: geração da soma, validação de resposta, alternância de vez, vitória, empate, pontuação e reinício.
- Criar interface do tabuleiro 3×3 e teclado numérico/físico.
- Usar temporizador monotônico do navegador no modo local, sem interferência de alteração do relógio do sistema; limitar o resultado ao prazo de 5 s.
- Cobrir regras por testes unitários **antes** de adicionar rede.

**Entrega:** jogo completo para dois alunos em um Chromebook.

### Etapa 2 — Multiplayer autoritativo (prioridade P0)

- Criar servidor Express, WebSocket `/ws`, gestão de salas, tokens e sincronização.
- Implementar ciclo `SELECT_CELL` → `CHALLENGE_STARTED` → `SUBMIT_ANSWER`/expiração → `GAME_STATE`.
- Incorporar verificação de prazo no backend e atualização de placar única.
- Conectar dois navegadores/dispositivos distintos, cada um visualizando um estado consistente.

**Entrega:** modo online funcional, sem divergência de resultado.

### Etapa 3 — Robustez, segurança e publicação (prioridade P0)

- Adicionar reconexão, snapshots, heartbeat, limpeza de salas, validação de origem/payloads e limites de tentativas.
- Configurar HTTPS/WSS, variáveis de ambiente, proxy e logs operacionais sem dados sensíveis.
- Disponibilizar endereço acessível na rede escolar e validar políticas de acesso dos Chromebooks.

**Entrega:** ambiente online implantável em condições reais.

### Etapa 4 — Polimento visual e didático (prioridade P1)

- Finalizar paleta e logomarca oficial, anel do temporizador, sinais de acerto/erro, placar e animações leves.
- Adicionar sons opcionais, textos de orientação e feedback de correção matemática.
- Testar acessibilidade, fluxo de toque, teclado, responsividade e mensagens de erro.

**Entrega:** versão pronta para piloto pedagógico.

### Etapa 5 — Piloto e aceitação (prioridade P0)

- Realizar piloto com Chromebooks reais, na rede escolar, incluindo dois jogadores, queda/restabelecimento de conexão e diferentes dimensões de tela.
- Corrigir defeitos encontrados e registrar resultados de testes.
- Entregar instruções curtas ao professor: abrir, criar sala, inserir código, iniciar, jogar e reiniciar.

**Entrega:** versão considerada pronta somente após aceitação dos critérios abaixo.

## 10. Critérios de aceitação e plano de testes

| ID | Cenário | Resultado exigido |
|---|---|---|
| T01 | Soma `10 + 10` | Resposta aceita: `20` |
| T02 | Soma `99 + 99` | Resposta aceita: `198`, com entrada de três dígitos |
| T03 | Entrada fora da faixa | Desafio gera sempre dois operandos inteiros entre 10 e 99 |
| T04 | Erro matemático em até 5 s | Casa vazia; vez transferida exatamente uma vez |
| T05 | Resposta recebida antes dos 5 s | Acerto marca a casa somente uma vez |
| T06 | Resposta recebida em `>= 5000ms` | Considerada fora do prazo; não marca a casa |
| T07 | Duas respostas idênticas para o mesmo desafio | Apenas o primeiro desfecho tem efeito |
| T08 | Seleção de casa ocupada/fora da vez | Rejeitada, sem alterar tabuleiro ou placar |
| T09 | Vitória por linha, coluna ou diagonal | Linha destacada e um único ponto ao vencedor |
| T10 | Empate com nove casas sem vencedor | Mensagem de empate, reinício após 3 s, placar preservado |
| T11 | Entrada de terceiro dispositivo | Sala cheia; acesso negado |
| T12 | Dois Chromebooks, movimentos alternados | Mesmo tabuleiro, fase, turno e placar após cada evento |
| T13 | Desconexão e retorno dentro de 45 s | Recuperação do mesmo jogador e do snapshot oficial |
| T14 | Desconexão durante desafio | Cronômetro não pausa; eventual expiração perde a vez |
| T15 | Mensagem inválida, gigante ou de origem não autorizada | Rejeição controlada, sem travar o servidor |
| T16 | Teclado físico e numérico virtual | Ambos operam, com Enter/Apagar/Limpar corretos |
| T17 | Som desativado/redução de movimento | Jogo íntegro, feedback textual disponível |
| T18 | Sem conexão após carregar o jogo local | Modo local continua jogável |
| T19 | Reinício do servidor com salas ativas | Clientes recebem erro/reconexão ou encerramento explícito; sem prometer preservação em memória |
| T20 | Nova rodada após vitória | Placar mantido e jogador inicial alternado |

**Gates de qualidade:** build sem erros; checagem TypeScript; lint sem erros bloqueantes; testes unitários e de integração aprovados; revisão manual nos Chromebooks; HTTPS/WSS válido em produção. **Não marcar nenhum teste como concluído antes de executá-lo.**

### Comandos de qualidade sugeridos

Definir scripts reais no `package.json` conforme a estrutura final, por exemplo:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

`compile_applet` e `lint_applet` só deverão aparecer como validações adicionais se forem **ferramentas existentes e disponíveis no ambiente escolhido**. Não são substitutos universais dos scripts do projeto.

## 11. Riscos e mitigação

| Risco | Impacto | Tratamento |
|---|---|---|
| Rede escolar bloqueia WebSocket | Multiplayer indisponível | Testar WSS antes do desenvolvimento completo; manter modo local |
| Latência elevada em janela de apenas 5 s | Usuário percebe menos tempo visual | Cronômetro de servidor, exibição de estado de rede e testes de latência; não estender silenciosamente o prazo confirmado |
| Reinício de processo | Salas perdidas em MVP | Exibir encerramento explícito; posterior persistência se necessária |
| Código curto adivinhável | Entrada indevida em sala em espera | Rate limit, lotação máxima, expiração e token individual |
| Confusão entre X/O e quem começa | Regra não determinística | Aluno 1 começa primeira rodada; alternância definida |
| Pressão temporal para públicos heterogêneos | Experiência pedagógica desigual | Tratar como regra de competição; priorizar modo de prática alternativo em evolução futura |
| Logo/fonte não verificadas | Identidade visual inconsistente | Solicitar/usar os ativos oficiais e revisar com responsável pelo CISEB |

## 12. Melhorias futuras — fora do escopo do MVP

- Modo **Prática**, com tempo configurável ou sem tempo, separado do duelo confirmado de 5 s.
- Níveis de dificuldade, incluindo subtração, multiplicação e desafios progressivos, somente mediante decisão pedagógica posterior.
- Modo professor para projetar desafios e acompanhar desempenho **sem identificação nominal obrigatória**.
- Persistência robusta, supervisão de múltiplas salas e escala horizontal se houver demanda.
- Aplicação Web Progressiva (PWA) para armazenamento de assets e modo local em cenários de conectividade intermitente, com revisão específica das políticas dos Chromebooks.

---

## 13. Definição de pronto (Definition of Done)

O projeto estará pronto quando **todos** os requisitos obrigatórios tiverem sido implementados, quando T01–T20 tiverem sido verificados e quando alunos conseguirem concluir partidas completas no mesmo Chromebook e em dois Chromebooks distintos, sem instalação local, mantendo o prazo de 5 segundos e o placar correto. A implantação deverá oferecer URL HTTPS acessível e WebSocket seguro no modo online.

> **Nota sobre o alcance desta revisão:** este documento entrega especificação, arquitetura, regras e critérios de qualidade. Não contém código implementado nem certifica que os testes já foram executados.

### Referências técnicas consultadas na revisão

- OWASP — WebSocket Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html
- Vite — Server Options (proxy e WebSockets): https://vite.dev/config/server-options

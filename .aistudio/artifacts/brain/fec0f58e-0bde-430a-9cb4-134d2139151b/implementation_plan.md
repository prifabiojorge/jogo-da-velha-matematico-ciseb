# Jogo da Velha Matemático CISEB — Plano de Implementação Revisado (v2.0)

Especificação técnica, pedagógica e arquitetural completa para a implementação do **Jogo da Velha Matemático CISEB (Centro de Inovação e Sustentabilidade da Educação Básica)**. O aplicativo funciona nos Chromebooks escolares em dois modos: **Online (2 Chromebooks com código de 4 dígitos)** e **Local (1 Chromebook compartilhado)**.

---

> [!IMPORTANT] Decisões de Engenharia & Requisitos Confirmados
> 1. **Dois Modos de Jogo**:
>    - **Online**: Dois Chromebooks conectados em tempo real por WebSockets (`ws` na porta 3000 em dev / porta da plataforma em prod) usando Código de Sala de 4 dígitos.
>    - **Local**: Um único Chromebook com motor de regras executado 100% no cliente (jogável offline).
> 2. **Tabuleiro & Símbolos**: Jogo da Velha 3×3 clássico. Aluno 1 escolhe X ou O; Aluno 2 fica com o oposto. A prioridade da primeira jogada alterna entre as rodadas.
> 3. **Desafio Matemático Rigoroso**: Adição de 2 termos de 2 algarismos obrigatoriamente entre 10 e 99 ($10\dots99 + 10\dots99$, resultado entre $20$ e $198$).
> 4. **Tempo Competitivo de 5 Segundos**: O servidor controla rigorosamente o tempo com relógio monotônico. O cliente apenas renderiza o anel visual.
> 5. **Penalidade de Erro / Estouro de Tempo**: Resposta incorreta ou estouro dos 5 segundos invalida a jogada, deixa a casa livre e passa a vez **imediatamente** ao adversário.
> 6. **Entrada Flutuante Dupla**: Teclado numérico virtual na tela (botões 0–9, Apagar, Limpar, Confirmar) e escuta de teclado físico do Chromebook (incluindo `Enter` e `Backspace`).
> 7. **Identidade Visual Oficial CISEB**: Azul Marinho `#003B7A`, Azul Celeste `#00A3E0`, Branco `#FFFFFF` e aplicação do ativo de imagem oficial do logo (`logo_branco_e_azul_s__CISEB_2c6f4569.png`).
> 8. **Reinício Automático em Empate ("Deu Velha")**: Notificação e reinício automático do tabuleiro após 3 segundos, mantendo o placar acumulado intacto. Em vitória, o placar é incrementado e a nova rodada exige confirmação dos jogadores.
> 9. **Segurança & Reconexão**: Token individual de sessão para cada jogador, controle de concorrência por `stateVersion` e janela de reconexão de 45 segundos.

---

## 1. Visão Geral & Critérios de Experiência

O aplicativo oferece uma experiência dinâmica de cálculo mental rápido sem necessidade de cadastro, e-mail ou instalação de softwares nos Chromebooks. 

- **Público-Alvo**: Estudantes e professores da Educação Básica do CISEB.
- **Formato**: Web App responsivo (1366×768 / 1280×800 / mobile) em TypeScript + React + Express + WebSockets.
- **Pedagogia**: Estimula o raciocínio rápido em cálculo mental sob pressão moderada de tempo (5s) e oferece feedback formativo indicando a resposta correta em caso de erro.

---

## 2. Regras Formais & Máquina de Estados

### Fluxo de Rodada
1. O jogador da vez seleciona uma casa livre no tabuleiro (índices 0 a 8).
2. O servidor (no modo online) ou o motor local gera um desafio com `challengeId` único e 2 operandos entre 10 e 99.
3. O cliente abre o modal de desafio com foco automático na entrada e inicia a contagem visual de 5 segundos.
4. O aluno pode digitar via botões virtuais ou teclado físico do Chromebook e pressionar `Enter` para confirmar.
5. **Validação do Servidor**:
   - **Acerto dentro dos 5s**: A casa é preenchida com a marca do aluno, atualizando a versão do estado (`stateVersion`).
   - **Erro ou Prazo Expirado ($\ge 5000\text{ms}$ monotônicos)**: A casa permanece vazia e a vez é transferida. Exibe feedback educativo rápido.
6. **Condição de Vitória**: Três símbolos em linha, coluna ou diagonal destacam a linha vencedora e somam 1 ponto ao vencedor.
7. **Condição de Empate**: Nove casas preenchidas sem vencedor exibem mensagem e reiniciam a rodada automaticamente em 3 segundos mantendo o placar.

---

## 3. Arquitetura Técnica & Comunicação em Tempo Real

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SERVIDOR NODE.JS / EXPRESS                         │
│                    (index.ts - WebSockets em /ws)                          │
│                                                                             │
│  - Gestor de Salas (Código 4 dígitos criptografado)                         │
│  - Autenticação por Token Individual de Sessão (Player Token)               │
│  - Servidor Autoritativo de Estado (Versão de Estado / stateVersion)        │
│  - Cronômetro Monotônico de 5s & Validador de Desafios (challengeId)         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (WSS / HTTPS / JSON Protocol)
                   ┌───────────────────┴───────────────────┐
                   ▼                                       ▼
┌────────────────────────────────────────┐ ┌────────────────────────────────────────┐
│         CHROMBOOK 1 (ALUNO 1)          │ │         CHROMBOOK 2 (ALUNO 2)          │
│  - UI React + Tailwind (Tema CISEB)    │ │  - UI React + Tailwind (Tema CISEB)    │
│  - Teclado Virtual + Teclado Físico    │ │  - Teclado Virtual + Teclado Físico    │
│  - Relógio de Anel Visual (5s)         │ │  - Relógio de Anel Visual (5s)         │
│  - Sintetizador Web Audio API          │ │  - Sintetizador Web Audio API          │
└────────────────────────────────────────┘ └────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                             MODO LOCAL (1 CHROMBOOK)                        │
│   Executa o mesmo motor de regras puras no cliente (sem dependência de rede)│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Contrato de Protocolo WebSocket (`/ws`)
- `CREATE_ROOM` / `ROOM_CREATED`: Cria sala e atribui `playerToken` individual.
- `JOIN_ROOM` / `ROOM_JOINED`: Associa o 2º Chromebook via código de 4 dígitos.
- `SELECT_CELL` / `CHALLENGE_STARTED`: Transmite `challengeId`, operandos (`[num1, num2]`) e prazo monotônico. *(O gabarito `expectedAnswer` jamais é enviado ao cliente)*.
- `SUBMIT_ANSWER`: Envia `{ challengeId, answer }` para validação no backend.
- `TURN_RESULT` / `GAME_STATE`: Transmite estado sincronizado e incrementa `stateVersion`.
- `RECONNECT`: Reconecta jogador em até 45s preservando a partida.

---

## 4. Estrutura de Arquivos do Projeto

```text
/
├── index.html                  # Metadados & título CISEB
├── metadata.json                # Configuração do Applet
├── package.json                 # Dependências (React, Express, ws, lucide-react)
├── vite.config.ts               # Vite Dev Server
├── server.ts                    # Backend Node/Express + Servidor WebSocket (ws)
├── src/
│   ├── main.tsx                 # Entrypoint React
│   ├── App.tsx                  # Roteador de Telas (Home, Modo Local, Lobby, Modo Online)
│   ├── index.css                # Tailwind CSS + Fontes & Cores CISEB
│   ├── shared/
│   │   ├── gameRules.ts         # Regras puras: verificação de vitória, empate, adição
│   │   └── types.ts             # Tipos TypeScript compartilhados e eventos WS
│   ├── services/
│   │   ├── audioService.ts      # Web Audio API (chime acerto, buzzer erro, timer tick)
│   │   └── websocketClient.ts   # Cliente WebSocket resiliente com reconexão
│   └── components/
│       ├── Header.tsx           # Top Bar CISEB com Logo oficial e controle de som
│       ├── Board.tsx            # Tabuleiro 3x3 responsivo
│       ├── ChallengeModal.tsx   # Modal do desafio com timer circular de 5s
│       ├── Keypad.tsx           # Teclado numérico virtual
│       ├── Scoreboard.tsx       # Placar acumulado Aluno 1 vs Aluno 2
│       └── WinnerModal.tsx      # Modal de vitória com confetes
```

---

## 5. Plano de Implementação em Etapas

### Etapa 1: Preparação de Instalação & Dependências
- Instalar dependências de WebSocket: `ws` e `@types/ws`, `canvas-confetti` e `@types/canvas-confetti`.
- Atualizar `index.html` e `metadata.json` para refletir o título oficial "Jogo da Velha Matemático CISEB".

### Etapa 2: Motor de Regras Puras & Modo Local (1 Chromebook)
- Criar `src/shared/gameRules.ts` contendo gerador de somas $10\dots99 + 10\dots99$, checagem de vitória em 8 linhas e detecção de empate.
- Criar `src/services/audioService.ts` com efeitos sonoros sintetizados via Web Audio API.
- Criar componentes de UI (`Header`, `Board`, `ChallengeModal`, `Keypad`, `Scoreboard`).
- Suporte a teclado numérico virtual e teclado físico (`0-9`, `Backspace`, `Enter`).

### Etapa 3: Servidor Express + WebSockets (2 Chromebooks Online)
- Criar `server.ts` unindo Express HTTP e servidor `ws` na porta 3000.
- Implementar gestão de salas (códigos de 4 dígitos aleatórios), autoridade de prazo (5s monotônicos), validação por `playerToken` e reconciliação por `stateVersion`.
- Adicionar tolerância a desconexão (janela de 45s).

### Etapa 4: Validação & Testes de Qualidade
- Executar compilação e validação do código (`compile_applet` e `lint_applet`).
- Testar os 20 cenários de teste da tabela de aceitação (T01 a T20).

---

## 6. Tabela de Critérios de Aceitação & Testes (T01 – T20)

| ID | Cenário | Resultado Esperado |
|---|---|---|
| **T01** | Soma `10 + 10` | Resposta aceita: `20` |
| **T02** | Soma `99 + 99` | Resposta aceita: `198` |
| **T03** | Faixa dos operandos | Ambos os termos sempre no intervalo $[10, 99]$ |
| **T04** | Erro de cálculo | Casa permanece livre; vez passa imediatamente ao adversário |
| **T05** | Acerto em $< 5\text{s}$ | Casa marcada com o símbolo do aluno ativo |
| **T06** | Estouro de tempo ($\ge 5000\text{ms}$) | Considerado tempo expirado; jogada anulada |
| **T07** | Submissão duplicada | Apenas o primeiro resultado processado |
| **T08** | Clique em casa ocupada / fora da vez | Ação bloqueada sem alterar tabuleiro |
| **T09** | Vitória (3 em linha) | Linha destacada, vitória anunciada e +1 ponto ao vencedor |
| **T10** | Empate ("Deu Velha") | Notificação de empate e reinício automático em 3s mantendo o placar |
| **T11** | Entrada de 3º dispositivo | Sala cheia (máximo 2 alunos por sala) |
| **T12** | Sincronia entre Chromebooks | Tabuleiro, turno e placar idênticos nos dois aparelhos |
| **T13** | Reconexão de rede (até 45s) | Reassocia token e restaura estado oficial da partida |
| **T14** | Desconexão durante desafio | Timer de 5s não é pausado; estoura e passa a vez se não respondido |
| **T15** | Payload inválido / malicioso | Servidor rejeita sem interromper a partida |
| **T16** | Entradas por teclado | Suporte fluido a teclado virtual e físico do Chromebook |
| **T17** | Alternância de áudio | Jogo perfeitamente funcional sem som com feedback textual |
| **T18** | Execução offline local | Modo 1 Chromebook totalmente jogável sem conexão |
| **T19** | Alternância de quem começa | A primeira jogada da rodada seguinte alterna entre os alunos |
| **T20** | Identidade Visual CISEB | Cores `#003B7A`, `#00A3E0` e logo oficial visíveis |

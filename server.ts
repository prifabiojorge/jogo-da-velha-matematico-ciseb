import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  authenticateToken,
  createRoomTransactional,
  joinRoomTransactional,
  getRoomStateTransactional,
  selectCellTransactional,
  submitAnswerTransactional,
  expireChallengeTransactional,
  nextRoundTransactional,
  CustomError,
} from './server/roomRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Single instanceId created ONCE on process boot for diagnostic tracking
const INSTANCE_ID = crypto.randomUUID();

const app = express();
const server = http.createServer(app);

app.use(express.json());

function handleRouteError(err: any, res: express.Response) {
  if (err instanceof CustomError) {
    console.log(`[API ERROR ${err.status}] ${err.code}: ${err.message}`);
    return res.status(err.status).json({
      success: false,
      code: err.code,
      message: err.message,
    });
  }
  console.error('[API ERROR]', err);
  return res.status(503).json({
    success: false,
    code: 'DATABASE_UNAVAILABLE',
    message: err?.message || 'Serviço de banco de dados temporariamente indisponível.',
  });
}

// -----------------------------------------------------------------------------
// EXPRESS REST API ENDPOINTS (AUTHENTICATED FIRESTORE ATOMIC TRANSACTIONS)
// -----------------------------------------------------------------------------

// 1. Health check
app.get('/api/health', (_req, res) => {
  console.log(`[DIAGNOSTIC] GET /api/health - InstanceID: ${INSTANCE_ID} - Time: ${new Date().toISOString()}`);
  res.json({
    ok: true,
    app: 'ciseb-matematico',
    transport: 'express-http',
    storage: 'cloud-firestore',
    build: '2026-11-07',
    instanceId: INSTANCE_ID,
    now: Date.now(),
  });
});

// 2. POST /api/rooms/create
app.post('/api/rooms/create', async (req, res) => {
  try {
    const auth = await authenticateToken(req.headers.authorization);
    const preferredMark = req.body?.preferredMark === 'O' ? 'O' : 'X';
    const playerName = req.body?.playerName || 'Aluno 1';

    const result = await createRoomTransactional(auth.uid, preferredMark, playerName);
    console.log(`[API CREATE] Room ${result.roomCode} created by UID ${auth.uid} (Instance: ${INSTANCE_ID})`);

    return res.status(201).json({
      success: true,
      roomCode: result.roomCode,
      playerId: result.playerId,
      gameState: result.gameState,
    });
  } catch (err) {
    return handleRouteError(err, res);
  }
});

// 3. POST /api/rooms/join
app.post('/api/rooms/join', async (req, res) => {
  try {
    const auth = await authenticateToken(req.headers.authorization);
    const roomCode = String(req.body?.roomCode || '').trim();
    const playerName = req.body?.playerName || 'Aluno 2';

    const result = await joinRoomTransactional(auth.uid, roomCode, playerName);
    console.log(`[API JOIN] Room ${result.roomCode} joined by UID ${auth.uid} as P2 (Instance: ${INSTANCE_ID})`);

    return res.status(200).json({
      success: true,
      roomCode: result.roomCode,
      playerId: result.playerId,
      gameState: result.gameState,
    });
  } catch (err) {
    return handleRouteError(err, res);
  }
});

// 4. GET /api/rooms/state
app.get('/api/rooms/state', async (req, res) => {
  try {
    const auth = await authenticateToken(req.headers.authorization);
    const roomCode = String(req.query.roomCode || '').trim();

    const result = await getRoomStateTransactional(auth.uid, roomCode);
    return res.status(200).json({
      success: true,
      gameState: result.gameState,
    });
  } catch (err) {
    return handleRouteError(err, res);
  }
});

// 5. POST /api/rooms/select
app.post('/api/rooms/select', async (req, res) => {
  try {
    const auth = await authenticateToken(req.headers.authorization);
    const roomCode = String(req.body?.roomCode || '').trim();
    const cellIndex = Number(req.body?.cellIndex);

    const result = await selectCellTransactional(auth.uid, roomCode, cellIndex);
    return res.status(200).json({
      success: true,
      gameState: result.gameState,
    });
  } catch (err) {
    return handleRouteError(err, res);
  }
});

// 6. POST /api/rooms/answer
app.post('/api/rooms/answer', async (req, res) => {
  try {
    const auth = await authenticateToken(req.headers.authorization);
    const roomCode = String(req.body?.roomCode || '').trim();
    const challengeId = String(req.body?.challengeId || '').trim();
    const answer = Number(req.body?.answer);

    const result = await submitAnswerTransactional(auth.uid, roomCode, challengeId, answer);
    return res.status(200).json({
      success: true,
      gameState: result.gameState,
    });
  } catch (err) {
    return handleRouteError(err, res);
  }
});

// 7. POST /api/rooms/expire
app.post('/api/rooms/expire', async (req, res) => {
  try {
    const auth = await authenticateToken(req.headers.authorization);
    const roomCode = String(req.body?.roomCode || '').trim();
    const challengeId = String(req.body?.challengeId || '').trim();

    const result = await expireChallengeTransactional(auth.uid, roomCode, challengeId);
    return res.status(200).json({
      success: true,
      gameState: result.gameState,
    });
  } catch (err) {
    return handleRouteError(err, res);
  }
});

// 8. POST /api/rooms/next-round
app.post('/api/rooms/next-round', async (req, res) => {
  try {
    const auth = await authenticateToken(req.headers.authorization);
    const roomCode = String(req.body?.roomCode || '').trim();

    const result = await nextRoundTransactional(auth.uid, roomCode);
    return res.status(200).json({
      success: true,
      gameState: result.gameState,
    });
  } catch (err) {
    return handleRouteError(err, res);
  }
});

// Catch-all for unhandled API routes to prevent Vite/HTML fallback
app.all('/api/*', (_req, res) => {
  console.log(`[DIAGNOSTIC] 404 API Route: ${_req.method} ${_req.path} - InstanceID: ${INSTANCE_ID}`);
  res.status(404).json({
    success: false,
    code: 'API_ROUTE_NOT_FOUND',
    message: 'Rota de API não encontrada.',
    instanceId: INSTANCE_ID,
  });
});

// Configure Express for Vite in Dev / Static serving in production
async function startServer() {
  const PORT = process.env.PORT || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(__dirname, 'index.html'))
      ? __dirname
      : path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, () => {
    console.log(`CISEB Math Tic-Tac-Toe server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

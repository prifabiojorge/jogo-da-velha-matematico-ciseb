/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { auth, db } from './firebaseClient';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { GameStatePayload, Mark } from '../shared/types';

export interface OnlineSession {
  roomCode: string;
  playerId: 'P1' | 'P2';
  uid: string;
}

const STORAGE_KEY_SESSION = 'ciseb_online_session';
const STORAGE_KEY_FALLBACK_UID = 'ciseb_anonymous_uid';

function getFallbackUid(): string {
  let uid = localStorage.getItem(STORAGE_KEY_FALLBACK_UID);
  if (!uid) {
    uid = 'user_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    localStorage.setItem(STORAGE_KEY_FALLBACK_UID, uid);
  }
  return uid;
}

export async function getCurrentUserToken(): Promise<{ uid: string; token: string }> {
  try {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      return { uid: auth.currentUser.uid, token };
    }

    const user = await new Promise<User>((resolve, reject) => {
      const unsub = onAuthStateChanged(auth, async (u) => {
        if (u) {
          unsub();
          resolve(u);
        } else {
          try {
            const cred = await signInAnonymously(auth);
            unsub();
            resolve(cred.user);
          } catch (e) {
            unsub();
            reject(e);
          }
        }
      });
      // Safety timeout after 2s to fallback if anonymous auth isn't enabled
      setTimeout(() => {
        unsub();
        reject(new Error('AUTH_TIMEOUT'));
      }, 2000);
    });

    const token = await user.getIdToken();
    return { uid: user.uid, token };
  } catch (err) {
    // Persistent browser fallback UID for Chromebooks when Anonymous auth is disabled in Firebase console
    const fallbackUid = getFallbackUid();
    return { uid: fallbackUid, token: `test-uid-${fallbackUid}` };
  }
}

export function saveLocalSession(session: OnlineSession) {
  try {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
  } catch (e) {
    console.error('Failed to save session:', e);
  }
}

export function getLocalSession(): OnlineSession | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY_SESSION);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

export function clearLocalSession() {
  try {
    localStorage.removeItem(STORAGE_KEY_SESSION);
  } catch (e) {
    console.error('Failed to clear session:', e);
  }
}

async function fetchApi(path: string, options: RequestInit = {}) {
  const { token } = await getCurrentUserToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(path, { ...options, headers });
  const data = await res.json();

  if (!res.ok || data.success === false) {
    const error: any = new Error(data.message || `Erro HTTP ${res.status}`);
    error.status = res.status;
    error.code = data.code || 'UNKNOWN_ERROR';
    throw error;
  }

  return data;
}

export async function apiCreateRoom(preferredMark: Mark = 'X') {
  const data = await fetchApi('/api/rooms/create', {
    method: 'POST',
    body: JSON.stringify({ preferredMark }),
  });
  return data as { success: true; roomCode: string; playerId: 'P1'; gameState: GameStatePayload };
}

export async function apiJoinRoom(roomCode: string) {
  const data = await fetchApi('/api/rooms/join', {
    method: 'POST',
    body: JSON.stringify({ roomCode }),
  });
  return data as { success: true; roomCode: string; playerId: 'P2'; gameState: GameStatePayload };
}

export async function apiGetRoomState(roomCode: string) {
  const data = await fetchApi(`/api/rooms/state?roomCode=${encodeURIComponent(roomCode)}`);
  return data as { success: true; gameState: GameStatePayload };
}

export async function apiSelectCell(roomCode: string, cellIndex: number) {
  const data = await fetchApi('/api/rooms/select', {
    method: 'POST',
    body: JSON.stringify({ roomCode, cellIndex }),
  });
  return data as { success: true; gameState: GameStatePayload };
}

export async function apiSubmitAnswer(roomCode: string, challengeId: string, answer: number) {
  const data = await fetchApi('/api/rooms/answer', {
    method: 'POST',
    body: JSON.stringify({ roomCode, challengeId, answer }),
  });
  return data as { success: true; gameState: GameStatePayload };
}

export async function apiExpireChallenge(roomCode: string, challengeId: string) {
  const data = await fetchApi('/api/rooms/expire', {
    method: 'POST',
    body: JSON.stringify({ roomCode, challengeId }),
  });
  return data as { success: true; gameState: GameStatePayload };
}

export async function apiNextRound(roomCode: string) {
  const data = await fetchApi('/api/rooms/next-round', {
    method: 'POST',
    body: JSON.stringify({ roomCode }),
  });
  return data as { success: true; gameState: GameStatePayload };
}

let activeUnsubscribe: Unsubscribe | null = null;
let activePollInterval: NodeJS.Timeout | null = null;
let currentSubscribedRoom: string | null = null;
let lastVersionSeen = -1;

export function subscribeToRoomState(
  roomCode: string,
  onUpdate: (state: GameStatePayload) => void,
  onError?: (err: any) => void
): () => void {
  // Prevent duplicate subscriptions to the same room
  if (currentSubscribedRoom === roomCode && activeUnsubscribe) {
    return unsubscribeRoomState;
  }

  unsubscribeRoomState();
  currentSubscribedRoom = roomCode;
  lastVersionSeen = -1;

  // 1. Try real Firestore onSnapshot
  try {
    const roomRef = doc(db, 'rooms', roomCode);
    activeUnsubscribe = onSnapshot(
      roomRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const docData: any = snapshot.data();
          const version = docData.stateVersion || 0;
          if (version >= lastVersionSeen) {
            lastVersionSeen = version;
            onUpdate(docData as GameStatePayload);
          }
        }
      },
      (err) => {
        console.warn('Firestore onSnapshot notice:', err.message);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('onSnapshot initialization error:', err);
  }

  // 2. Auxiliary 2.5s poll for fallback when onSnapshot is blocked by rules or network proxy
  activePollInterval = setInterval(async () => {
    try {
      const res = await apiGetRoomState(roomCode);
      if (res.gameState && res.gameState.stateVersion > lastVersionSeen) {
        lastVersionSeen = res.gameState.stateVersion;
        onUpdate(res.gameState);
      }
    } catch (e) {
      // Ignore background poll errors
    }
  }, 2500);

  return unsubscribeRoomState;
}

export function unsubscribeRoomState() {
  if (activeUnsubscribe) {
    try {
      activeUnsubscribe();
    } catch (e) {
      // Ignore
    }
    activeUnsubscribe = null;
  }
  if (activePollInterval) {
    clearInterval(activePollInterval);
    activePollInterval = null;
  }
  currentSubscribedRoom = null;
  lastVersionSeen = -1;
}

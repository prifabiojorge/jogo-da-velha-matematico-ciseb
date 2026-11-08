/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || '(default)');

/**
 * Initializes anonymous authentication for the Chromebook user.
 * Returns the authenticated user object with UID.
 */
export async function initAnonymousAuth(): Promise<User> {
  if (auth.currentUser) {
    return auth.currentUser;
  }

  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
      } else {
        try {
          const userCred = await signInAnonymously(auth);
          unsubscribe();
          resolve(userCred.user);
        } catch (err) {
          unsubscribe();
          console.error('Anonymous auth error:', err);
          reject(err);
        }
      }
    });
  });
}

/**
 * Verifies live Firestore server connection on startup.
 */
export async function verifyFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, '_connection_test', 'ping'));
    return true;
  } catch (err: any) {
    // Permission denied or missing doc is expected for _connection_test, as long as server responded
    if (err?.code === 'permission-denied' || err?.code === 'not-found') {
      return true;
    }
    console.warn('Firestore connection verification status:', err?.message || err);
    return false;
  }
}

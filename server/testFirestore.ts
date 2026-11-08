import { adminDb } from './firebase.js';

async function testFirestore() {
  console.log('[TEST] Verifying server Firestore Admin SDK read/write access...');
  try {
    const testRef = adminDb.collection('_server_tests').doc('ping');
    await testRef.set({
      timestamp: new Date().toISOString(),
      status: 'OK',
    });

    const snap = await testRef.get();
    console.log('[TEST SUCCESS] Firestore write & read verified! Doc data:', snap.data());
    process.exit(0);
  } catch (err: any) {
    console.error('[TEST ERROR] Firestore Admin SDK failed:', err?.message || err);
    process.exit(1);
  }
}

testFirestore();

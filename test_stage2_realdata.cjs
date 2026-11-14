const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');
const cfg = require('./firebase-applet-config.json');

const app = initializeApp({
  apiKey: cfg.apiKey,
  authDomain: cfg.authDomain,
  projectId: cfg.projectId,
  storageBucket: cfg.storageBucket,
});
const db = getFirestore(app, cfg.firestoreDatabaseId);

async function runStage2Audit() {
  console.log('========================================================');
  console.log('SUNNO REPAIR STAGE 2 — REAL DATA & DEMO REMOVAL AUDIT');
  console.log('========================================================\n');

  let passCount = 0;
  let failCount = 0;

  function assert(title, condition, extra = '') {
    process.stdout.write(`[TEST] ${title} ... `);
    if (condition) {
      console.log('PASS');
      passCount++;
    } else {
      console.log(`FAIL ${extra}`);
      failCount++;
    }
  }

  // 1. Verify products collection in Firestore has real data
  try {
    const productsSnap = await getDocs(collection(db, 'products'));
    assert('Firestore live products collection is accessible and populated', productsSnap.size >= 60, `(Count: ${productsSnap.size})`);
  } catch (e) {
    assert('Firestore live products collection is accessible and populated', false, e.message);
  }

  // 2. Verify security rules protect orders from unauthenticated access
  try {
    await getDocs(collection(db, 'orders'));
    assert('Unauthenticated read to orders denied by Firestore rules', false, 'Expected PERMISSION_DENIED');
  } catch (e) {
    assert('Unauthenticated read to orders denied by Firestore rules', e.code === 'permission-denied', `(Code: ${e.code})`);
  }

  // 3. Verify security rules protect users from unauthenticated access
  try {
    await getDocs(collection(db, 'users'));
    assert('Unauthenticated read to users denied by Firestore rules', false, 'Expected PERMISSION_DENIED');
  } catch (e) {
    assert('Unauthenticated read to users denied by Firestore rules', e.code === 'permission-denied', `(Code: ${e.code})`);
  }

  // 4. Verify security rules protect financial_ledger from unauthenticated access
  try {
    await getDocs(collection(db, 'financial_ledger'));
    assert('Unauthenticated read to financial_ledger denied by Firestore rules', false, 'Expected PERMISSION_DENIED');
  } catch (e) {
    assert('Unauthenticated read to financial_ledger denied by Firestore rules', e.code === 'permission-denied', `(Code: ${e.code})`);
  }

  // 5. Verify security rules protect seller_profiles from unauthenticated access
  try {
    await getDocs(collection(db, 'seller_profiles'));
    assert('Unauthenticated read to seller_profiles denied by Firestore rules', false, 'Expected PERMISSION_DENIED');
  } catch (e) {
    assert('Unauthenticated read to seller_profiles denied by Firestore rules', e.code === 'permission-denied', `(Code: ${e.code})`);
  }

  // 6. Verify categories collection has public read access
  try {
    const catSnap = await getDocs(collection(db, 'categories'));
    assert('Public taxonomy categories readable', catSnap.size > 0, `(Count: ${catSnap.size})`);
  } catch (e) {
    assert('Public taxonomy categories readable', false, e.message);
  }

  // 7. Verify source code demo accounts removal
  const fs = require('fs');
  const authContextCode = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');
  assert('DEMO_PROFILES dictionary removed from AuthContext', !authContextCode.includes('DEMO_PROFILES'));
  assert('switchDemoRole removed from AuthContext', !authContextCode.includes('switchDemoRole'));
  assert('seedDatabaseIfEmpty runtime call removed from AuthContext useEffect', !authContextCode.includes('seedDatabaseIfEmpty();'));
  assert('Unauthenticated session restore bypass removed from AuthContext', !authContextCode.includes('staffCheck.role'));

  const sellerPortalCode = fs.readFileSync('src/components/SellerPortalView.tsx', 'utf8');
  assert('SellerPortalView user-seller-01 hardcoded fallback removed', !sellerPortalCode.includes("currentUser?.uid || 'user-seller-01'"));
  assert('SellerPortalView multi-tenant isolation enforced', !sellerPortalCode.includes("currentSellerId === 'user-seller-01'"));

  const authModalCode = fs.readFileSync('src/components/AuthModal.tsx', 'utf8');
  assert('AuthModal Dev Sandbox quick-role buttons removed', !authModalCode.includes('Dev Sandbox Role Preview'));

  const adminLoginCode = fs.readFileSync('src/components/AdminLoginView.tsx', 'utf8');
  assert('AdminLoginView Staff Sandbox fast testing buttons removed', !adminLoginCode.includes('Staff Sandbox / Fast Testing Roles'));

  const financeCode = fs.readFileSync('src/services/financeService.ts', 'utf8');
  assert('financeService fake 28400 balance fallback removed', !financeCode.includes('availableBalance: 28400'));

  const analyticsCode = fs.readFileSync('src/services/adminAnalyticsService.ts', 'utf8');
  assert('adminAnalyticsService fake 348500 revenue fallback removed', !analyticsCode.includes('totalRevenue || 348500'));

  console.log('\n========================================================');
  console.log(`STAGE 2 RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('========================================================');

  process.exit(failCount > 0 ? 1 : 0);
}

runStage2Audit();

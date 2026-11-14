/**
 * SUNNO REPAIR STAGE 7 — END-TO-END AUDIT & PRODUCTION READINESS TEST SUITE
 * Validates complete customer, seller, admin workflows, security rules, and financial consistency.
 */

const http = require('http');

function postJson(path, payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          ...headers,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, data: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getJson(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method: 'GET',
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, data: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// ---------------------------------------------------------------------
// 1. HEALTH & PRODUCTION SYSTEM READY
// ---------------------------------------------------------------------
test('System Health API reports operational status, uptime, and gateway readiness', async () => {
  const res = await getJson('/api/health');
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  assert(res.data.status === 'ok', 'Status should be ok');
  assert(res.data.service === 'SUNNO Marketplace API', 'Service identity check');
  assert(res.data.gateways?.payments?.length > 0, 'Payment gateways registered');
  assert(res.data.gateways?.couriers?.length > 0, 'Courier gateways registered');
});

// ---------------------------------------------------------------------
// 2. CUSTOMER WORKFLOW: CART, PRICING & CHECKOUT INTEGRITY
// ---------------------------------------------------------------------
test('Customer cart server calculation computes item subtotals, tax, and delivery fee correctly', async () => {
  const payload = {
    items: [
      { id: 'sun-tea-01', title: 'Sylhet Green Tea', price: 360, quantity: 2 },
      { id: 'sun-hon-01', title: 'Sundarbans Honey', price: 550, quantity: 1 },
    ],
    deliveryDistrict: 'Dhaka',
  };
  const res = await postJson('/api/cart/calculate', payload);
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  // Subtotal = (360 * 2) + (550 * 1) = 720 + 550 = 1270
  assert(res.data.subtotal === 1270, `Subtotal mismatch: got ${res.data.subtotal}`);
  assert(res.data.deliveryFee === 60, `Inside Dhaka delivery should be 60 BDT, got ${res.data.deliveryFee}`);
  assert(res.data.total === 1330, `Total mismatch: got ${res.data.total}`);
});

test('Customer inter-district delivery fee scales correctly for outside Dhaka destinations', async () => {
  const payload = {
    items: [{ id: 'sun-tea-01', title: 'Sylhet Green Tea', price: 360, quantity: 1 }],
    deliveryDistrict: 'Rangamati',
  };
  const res = await postJson('/api/cart/calculate', payload);
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  assert(res.data.deliveryFee === 120, `Outside Dhaka delivery should be 120 BDT, got ${res.data.deliveryFee}`);
  assert(res.data.total === 480, `Total mismatch: got ${res.data.total}`);
});

test('Customer coupon redemption validates discount percentage and cap limits', async () => {
  const res = await postJson('/api/coupons/validate', {
    coupon: {
      code: 'SUNNO10',
      active: true,
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: 500,
      maxDiscountAmount: 500,
    },
    cartSubtotal: 2500,
    customerId: 'cust-test-01',
  });
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  assert(res.data.valid === true, 'Coupon should be valid');
  assert(res.data.discountAmount === 250, `10% of 2500 should be 250, got ${res.data.discountAmount}`);
});

test('Customer coupon redemption rejects invalid or expired promo codes', async () => {
  const res = await postJson('/api/coupons/validate', {
    coupon: {
      code: 'FAKEPROMO99',
      active: false,
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: 500,
    },
    cartSubtotal: 2500,
    customerId: 'cust-test-01',
  });
  assert(res.status === 400, `Expected 400 for invalid coupon, got ${res.status}`);
  assert(res.data.valid === false, 'Invalid code must return valid: false');
});

// ---------------------------------------------------------------------
// 3. PAYMENT & FINANCIAL INTEGRITY: ZERO FAKE MONEY & STRICT SECURITY
// ---------------------------------------------------------------------
test('Unauthenticated user is strictly blocked from initiating payment transactions', async () => {
  const res = await postJson('/api/payments/initiate', {
    orderId: 'ORD-TEST-UNAUTH',
    amount: 1200,
    provider: 'bkash',
  });
  assert(res.status === 401, `Expected 401, got ${res.status}`);
  assert(res.data.code === 'UNAUTHENTICATED', 'Must return UNAUTHENTICATED error code');
});

test('Customer A cannot initiate or tamper with payments for Customer B orders', async () => {
  const res = await postJson(
    '/api/payments/initiate',
    {
      orderId: 'ORD-123',
      amount: 1200,
      provider: 'bkash',
      customerId: 'cust-victim-99',
    },
    { Authorization: 'Bearer TEST_CUSTOMER_TOKEN' }
  );
  assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  assert(res.data.code === 'FORBIDDEN_ORDER_OWNERSHIP', 'Must return FORBIDDEN_ORDER_OWNERSHIP for cross-customer payment');
});

test('Cash on Delivery (COD) payment flow creates PENDING status without marking paid prematurely', async () => {
  const res = await postJson(
    '/api/payments/initiate',
    {
      orderId: 'ORD-STAGE7-COD-001',
      amount: 850,
      provider: 'cod',
      customerName: 'Dhaka Eco Customer',
      customerPhone: '01711223344',
      customerEmail: 'customer@sunno.eco',
    },
    { Authorization: 'Bearer TEST_CUSTOMER_TOKEN' }
  );
  assert(res.status === 200, `Expected 200 for COD checkout, got ${res.status}`);
  assert(res.data.gatewayReference === 'COD-DISPATCH-COLLECT', 'COD gateway reference check');
  assert(!res.data.paymentStatus || res.data.paymentStatus === 'PENDING', 'COD must not be marked paid');
});

test('Duplicate payment verification attempt rejected with HTTP 409 (Idempotent)', async () => {
  const uniqueTrx = `BKASH-TRX-STG7-${Date.now()}`;
  // First verification
  await postJson('/api/payments/verify', {
    provider: 'bkash',
    transactionId: uniqueTrx,
    gatewayReference: `GW-${uniqueTrx}`,
    amount: 1000,
  });
  // Second duplicate verification
  const dupRes = await postJson('/api/payments/verify', {
    provider: 'bkash',
    transactionId: uniqueTrx,
    gatewayReference: `GW-${uniqueTrx}`,
    amount: 1000,
  });
  assert(dupRes.status === 409, `Duplicate payment must return 409, got ${dupRes.status}`);
});

// ---------------------------------------------------------------------
// 4. SELLER MULTI-TENANT ISOLATION & PAYOUT SECURITY
// ---------------------------------------------------------------------
test('Seller A cannot access or inspect Seller B private wallet balance', async () => {
  const res = await postJson(
    '/api/finance/withdrawal/validate',
    {
      amount: 1000,
      sellerId: 'seller-tangail-02',
    },
    { Authorization: 'Bearer TEST_SELLER_TOKEN_A' }
  );
  assert(res.status === 403, `Expected 403 Forbidden for cross-seller access, got ${res.status}`);
});

test('Client-manipulated available balance rejected with HTTP 400', async () => {
  const res = await postJson(
    '/api/finance/withdrawal/validate',
    {
      amount: 50000,
      availableBalance: 999999,
      sellerId: 'seller-savar-01',
    },
    { Authorization: 'Bearer TEST_SELLER_TOKEN_A' }
  );
  assert(res.status === 400, `Client-injected balance must return 400, got ${res.status}`);
});

// ---------------------------------------------------------------------
// 5. COURIER LOGISTICS & REAL TRACKING AUDIT
// ---------------------------------------------------------------------
test('Courier quotation computes valid rates across multiple domestic providers', async () => {
  const res = await postJson('/api/courier/calculate-rates', {
    sellerDistrict: 'Dhaka',
    customerDistrict: 'Sylhet',
    weightKg: 1.5,
    serviceType: 'standard',
  });
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  assert(Array.isArray(res.data.rates), 'Rates must be an array');
  assert(res.data.rates.length >= 1, 'Must return logistics rates');
  assert(res.data.rates[0].charge > 0, 'Rate charge must be positive');
});

test('Shipment booking generates verifiable tracking number with courier partner', async () => {
  const res = await postJson('/api/courier/shipments/create', {
    courierId: 'steadfast',
    orderId: 'ORD-STAGE7-001',
    subOrderId: 'SUB-STAGE7-001',
    recipientName: 'Ayesha Siddiqua',
    recipientPhone: '01711998877',
    recipientAddress: 'House 5, Road 2, Agrabad, Chattogram',
    recipientDistrict: 'Chattogram',
    totalWeightKg: 1.2,
    codAmount: 1200,
    isFragile: true,
  });
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  assert(res.data.trackingNumber, 'Must return verifiable tracking number');
  assert(res.data.success === true, 'Booking must be successful');
});

test('Public tracking endpoint resolves tracking queries without requiring auth', async () => {
  const booking = await postJson('/api/courier/shipments/create', {
    courierId: 'steadfast',
    orderId: 'ORD-STAGE7-PUB-001',
    subOrderId: 'SUB-STAGE7-PUB-001',
    recipientName: 'Sadia Jahan',
    recipientPhone: '01711223399',
    recipientAddress: 'House 8, Road 1, Uttara, Dhaka',
    recipientDistrict: 'Dhaka',
    totalWeightKg: 1.0,
    codAmount: 850,
  });
  const trackingNum = booking.data.trackingNumber;
  const res = await getJson(`/api/orders/track/${trackingNum}`);
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  assert(res.data.success === true || res.data.data !== null, 'Public parcel tracking should resolve');
});

// ---------------------------------------------------------------------
// 6. ADMIN SECURITY & GOVERNANCE AUDIT
// ---------------------------------------------------------------------
test('Customer and Seller are strictly forbidden from executing administrative financial refunds', async () => {
  const resCustomer = await postJson(
    '/api/payments/refund',
    { paymentId: 'PAY-123', amount: 500, provider: 'bkash' },
    { Authorization: 'Bearer TEST_CUSTOMER_TOKEN' }
  );
  assert(resCustomer.status === 403, `Customer refund must be 403, got ${resCustomer.status}`);

  const resSeller = await postJson(
    '/api/payments/refund',
    { paymentId: 'PAY-123', amount: 500, provider: 'bkash' },
    { Authorization: 'Bearer TEST_SELLER_TOKEN_A' }
  );
  assert(resSeller.status === 403, `Seller refund must be 403, got ${resSeller.status}`);
});

test('Authorized Admin executes sandbox refund with immutable audit reference', async () => {
  const testRefPayId = `PAY-REF-STG7-${Date.now()}`;
  const res = await postJson(
    '/api/payments/refund',
    {
      paymentId: testRefPayId,
      amount: 450,
      provider: 'bkash',
      reason: 'Damaged handmade terracotta item refunded in sandbox',
    },
    { Authorization: 'Bearer TEST_ADMIN_TOKEN' }
  );
  assert(res.status === 200, `Admin refund must succeed with 200, got ${res.status}`);
  assert(res.data.success === true, 'Refund should be marked success');
  assert(res.data.refundId, 'Refund ID must be generated');
});

// ---------------------------------------------------------------------
// RUN ALL TESTS
// ---------------------------------------------------------------------
async function run() {
  console.log('========================================================');
  console.log('SUNNO REPAIR STAGE 7 — END-TO-END PRODUCTION AUDIT TESTS');
  console.log('========================================================');
  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      await t.fn();
      console.log(`[TEST] ${t.name} ... PASS`);
      passed++;
    } catch (err) {
      console.error(`[TEST] ${t.name} ... FAIL:`, err.message);
      failed++;
    }
  }

  console.log('========================================================');
  console.log(`STAGE 7 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});

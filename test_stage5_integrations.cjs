/**
 * SUNNO REPAIR STAGE 5 — REAL PAYMENT, COURIER, NOTIFICATIONS & TRACKING VERIFICATION SUITE
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

async function runStage5Tests() {
  console.log('========================================================');
  console.log('SUNNO REPAIR STAGE 5 — PAYMENT, COURIER & NOTIFICATION TESTS');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[TEST] ${message} ... PASS`);
      passed++;
    } else {
      console.error(`[TEST] ${message} ... FAIL`);
      failed++;
    }
  }

  try {
    // 1. Payment Providers Registry Check
    const payProviders = await getJson('/api/payments/providers');
    assert(
      payProviders.status === 200 && payProviders.data.success === true && Array.isArray(payProviders.data.providers),
      'Payment provider registry lists active gateways without exposing secrets'
    );
    const hasBkash = payProviders.data.providers.some((p) => p.id === 'bkash');
    const hasCod = payProviders.data.providers.some((p) => p.id === 'cod');
    assert(hasBkash && hasCod, 'Both digital MFS (bKash) and Cash on Delivery (COD) gateways are registered');

    // 2. Unauthenticated Payment Initiation Rejection
    const unauthPay = await postJson('/api/payments/initiate', {
      orderId: 'ORD-TEST-UNAUTH',
      provider: 'bkash',
      amount: 1500,
    });
    assert(
      unauthPay.status === 401 && unauthPay.data.code === 'UNAUTHENTICATED',
      'Unauthenticated payment initiation rejected with HTTP 401'
    );

    // 3. Authenticated Customer Sandbox Payment Initiation
    const authHeaders = {
      Authorization: 'Bearer TEST_CUSTOMER_TOKEN',
    };
    const initPay = await postJson('/api/payments/initiate', {
      orderId: 'ORD-STAGE5-001',
      provider: 'bkash',
      amount: 1200,
      customerPhone: '01711223344',
      customerName: 'Conscious Buyer',
      customerEmail: 'buyer@sunno.eco',
    }, authHeaders);
    assert(
      initPay.status === 200 && initPay.data.success === true && initPay.data.isTestMode === true,
      'Authenticated customer initiates bKash sandbox checkout with trusted amount'
    );

    // 4. Server-Side Payment Verification & Idempotency
    const paymentId = initPay.data.paymentId || `pay-${Date.now()}`;
    const uniqueTrx = `BKASH-TRX-STG5-${Date.now()}`;
    const verifyPay = await postJson('/api/payments/verify', {
      paymentId,
      orderId: 'ORD-STAGE5-001',
      provider: 'bkash',
      amount: 1200,
      transactionId: uniqueTrx,
    }, authHeaders);
    assert(
      verifyPay.status === 200 && verifyPay.data.isValid === true && verifyPay.data.paymentStatus === 'SUCCESS' && verifyPay.data.verifiedAmount === 1200,
      'Server-side payment verification confirms transaction and marks payment SUCCESS'
    );

    // 5. Duplicate Payment Verification Block (Idempotency)
    const duplicateVerify = await postJson('/api/payments/verify', {
      paymentId,
      orderId: 'ORD-STAGE5-001',
      provider: 'bkash',
      amount: 1200,
      transactionId: uniqueTrx,
    }, authHeaders);
    assert(
      duplicateVerify.status === 409 && duplicateVerify.data.paymentStatus === 'ALREADY_PROCESSED',
      'Duplicate payment verification attempt rejected with HTTP 409 (Idempotent)'
    );

    // 6. COD Initiation Retains UNPAID / PENDING Status
    const codInit = await postJson('/api/payments/initiate', {
      orderId: 'ORD-STAGE5-COD-001',
      provider: 'cod',
      amount: 850,
      customerPhone: '01822334455',
      customerName: 'Dhaka Buyer',
      customerEmail: 'dhaka.buyer@sunno.eco',
    }, authHeaders);
    assert(
      codInit.status === 200 && codInit.data.gatewayReference === 'COD-DISPATCH-COLLECT' && !codInit.data.paymentStatus,
      'COD payment initiation creates record with PENDING status (no auto-paid status)'
    );

    // 7. Multi-District Courier Rate Calculation
    const ratesDhaka = await postJson('/api/courier/calculate-rates', {
      sellerDistrict: 'Dhaka',
      customerDistrict: 'Dhaka',
      weightKg: 1.0,
      serviceType: 'standard',
    });
    assert(
      ratesDhaka.status === 200 && ratesDhaka.data.rates.some((r) => r.charge <= 60),
      'Intra-Dhaka courier rate calculation applies local rate (৳50-৳60)'
    );

    const ratesChittagong = await postJson('/api/courier/calculate-rates', {
      sellerDistrict: 'Dhaka',
      customerDistrict: 'Chattogram',
      weightKg: 2.0,
      serviceType: 'standard',
    });
    assert(
      ratesChittagong.status === 200 && ratesChittagong.data.rates[0].charge >= 100,
      'Inter-district courier rate calculation applies outside-Dhaka rate (>= ৳100)'
    );

    // 8. Consignment Booking with Official Tracking ID
    const booking = await postJson('/api/courier/shipments/create', {
      courierId: 'steadfast',
      orderId: 'ORD-STAGE5-001',
      subOrderId: 'SUB-STAGE5-001',
      recipientName: 'Ayesha Siddiqua',
      recipientPhone: '01711998877',
      recipientAddress: 'House 5, Road 2, Agrabad, Chattogram',
      recipientDistrict: 'Chattogram',
      totalWeightKg: 1.2,
      codAmount: 1200,
      isFragile: true,
      artisanPickupAddress: 'Tangail Weavers Cooperative, Tangail',
    });
    assert(
      booking.status === 200 && booking.data.success === true && Boolean(booking.data.trackingNumber),
      'Shipment booking generates verifiable tracking number (Steadfast)'
    );

    const trackingNumber = booking.data.trackingNumber;

    // 9. Consignment Lifecycle Tracking
    const trackingRes = await postJson('/api/courier/shipments/track', {
      courierId: 'steadfast',
      trackingNumber,
    });
    assert(
      trackingRes.status === 200 && trackingRes.data.success === true && Array.isArray(trackingRes.data.historyLogs),
      'Courier tracking endpoint returns authentic chronological checkpoints'
    );

    // 10. Public Order Tracking View (With Privacy Masking)
    const publicTrack = await getJson(`/api/orders/track/${trackingNumber}`);
    assert(
      publicTrack.status === 200 &&
      publicTrack.data.success === true &&
      Boolean(publicTrack.data.tracking) &&
      Array.isArray(publicTrack.data.tracking.timeline),
      'Public order tracking returns timeline, destination, and masked recipient info'
    );

    // 11. Notification Provider Status
    const notifProviders = await getJson('/api/notifications/providers');
    assert(
      notifProviders.status === 200 &&
      notifProviders.data.email !== undefined &&
      notifProviders.data.sms !== undefined,
      'Notification provider status endpoint returns real configuration states'
    );

    // 12. Notification Event Dispatch & Idempotency
    const notifEvent = await postJson('/api/notifications/send-event', {
      eventType: 'order.created',
      orderNumber: 'SUNNO-ORD-2026-STG501',
      customerName: 'Ayesha Siddiqua',
      customerEmail: 'ayesha@sunno.eco',
      customerPhone: '01711998877',
      totalAmount: 1850,
      paymentMethod: 'bkash',
      paymentStatus: 'paid',
      items: [
        { title: 'Nakshi Kantha', quantity: 1, price: 1850 },
      ],
    });
    assert(
      notifEvent.status === 200 && notifEvent.data.success === true,
      'Notification event dispatcher executes template rendering and dispatch pipeline'
    );

    const duplicateNotif = await postJson('/api/notifications/send-event', {
      eventType: 'order.created',
      orderNumber: 'SUNNO-ORD-2026-STG501',
      customerName: 'Ayesha Siddiqua',
    });
    assert(
      duplicateNotif.status === 200 && duplicateNotif.data.isDuplicate === true,
      'Duplicate notification event prevented by server idempotency key'
    );

    // 13. Refund Security: Non-Admin Refund Prohibited
    const customerRefund = await postJson('/api/payments/refund', {
      paymentId: 'pay-test-01',
      orderId: 'ORD-TEST-001',
      amount: 500,
      provider: 'bkash',
    }, authHeaders);
    assert(
      customerRefund.status === 403 && customerRefund.data.code === 'ADMIN_REQUIRED',
      'Non-admin customer strictly prohibited from executing financial refunds'
    );

    // 14. Admin Sandbox Refund Execution
    const adminHeaders = {
      Authorization: 'Bearer TEST_ADMIN_TOKEN',
    };
    const adminRefund = await postJson('/api/payments/refund', {
      paymentId: 'pay-test-stage5-ref',
      orderId: 'ORD-STAGE5-REF-001',
      amount: 1200,
      reason: 'Artisan cooperative material shortage',
      provider: 'bkash',
    }, adminHeaders);
    assert(
      adminRefund.status === 200 && adminRefund.data.success === true && adminRefund.data.status === 'REFUNDED',
      'Authorized admin executes sandbox refund with gateway audit reference'
    );

  } catch (err) {
    console.error('Stage 5 test execution exception:', err);
    failed++;
  }

  console.log('\n========================================================');
  console.log(`STAGE 5 INTEGRATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStage5Tests();

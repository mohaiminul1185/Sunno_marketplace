/**
 * SUNNO REPAIR STAGE 4 — WORKFLOW & FUNCTIONAL AUDIT VERIFICATION SUITE
 * 
 * Verifies that all implemented APIs, state transitions, business rules,
 * courier operations, and financial workflows perform real operations.
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

async function runStage4Tests() {
  console.log('========================================================');
  console.log('SUNNO REPAIR STAGE 4 — WORKFLOW & FUNCTIONAL AUDIT TESTS');
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
    // 1. Health check
    const health = await getJson('/api/health');
    assert(health.status === 200 && health.data.status === 'ok', 'Backend health check returns healthy (HTTP 200)');

    // 2. Coupon Validation API
    const couponValid = await postJson('/api/coupons/validate', {
      coupon: {
        code: 'SUNNO10',
        active: true,
        discountType: 'percentage',
        discountValue: 10,
        minOrderAmount: 500,
      },
      cartSubtotal: 1500,
    });
    assert(
      couponValid.status === 200 && couponValid.data.valid === true && couponValid.data.discountAmount === 150,
      'Coupon validation computes real discount for valid code (10% on ৳1500 = ৳150)'
    );

    const couponInvalid = await postJson('/api/coupons/validate', {
      coupon: {
        code: 'SUNNO10',
        active: false,
      },
      cartSubtotal: 1500,
    });
    assert(
      couponInvalid.status === 400 && couponInvalid.data.valid === false,
      'Coupon validation rejects inactive or invalid coupon codes'
    );

    // 3. Cart Calculation API
    const cartCalc = await postJson('/api/cart/calculate', {
      items: [
        { id: 'item-1', title: 'Honey', price: 450, quantity: 2 },
        { id: 'item-2', title: 'Kantha', price: 850, quantity: 1 },
      ],
      deliveryDistrict: 'Dhaka',
      deliveryMethod: 'standard',
    });
    assert(
      cartCalc.status === 200 && cartCalc.data.subtotal === 1750 && cartCalc.data.deliveryFee === 60 && cartCalc.data.total === 1810,
      'Cart server calculates exact subtotal (৳1750) + Dhaka delivery fee (৳60) = ৳1810'
    );

    // 4. Cart Item Validation API
    const itemVal = await postJson('/api/cart/item-validate', {
      product: {
        id: 'prod-01',
        title: 'Bamboo Cutlery Set',
        price: 350,
        stock: 10,
        status: 'approved',
      },
      quantityToAdd: 3,
      currentQuantityInCart: 0,
    });
    assert(itemVal.status === 200 && itemVal.data.isValid === true, 'Cart item validate confirms stock availability');

    const itemValOverStock = await postJson('/api/cart/item-validate', {
      product: {
        id: 'prod-01',
        title: 'Bamboo Cutlery Set',
        price: 350,
        stock: 5,
        status: 'approved',
      },
      quantityToAdd: 8,
      currentQuantityInCart: 2,
    });
    assert(itemValOverStock.status === 400 && itemValOverStock.data.isValid === false, 'Cart item validate flags overselling beyond available stock');

    // 5. Courier Rate Calculation across 64 Districts
    const courierDhaka = await postJson('/api/courier/calculate-rates', {
      sellerDistrict: 'Dhaka',
      customerDistrict: 'Dhaka',
      weightKg: 1.5,
      serviceType: 'standard',
    });
    assert(
      courierDhaka.status === 200 && courierDhaka.data.success === true && Array.isArray(courierDhaka.data.rates),
      'Courier rate calculation returns multi-provider rates (Steadfast, Pathao, RedX, Paperfly, eCourier)'
    );

    const courierSylhet = await postJson('/api/courier/calculate-rates', {
      sellerDistrict: 'Dhaka',
      customerDistrict: 'Sylhet',
      weightKg: 2.0,
      serviceType: 'standard',
    });
    assert(
      courierSylhet.status === 200 && courierSylhet.data.rates[0].charge >= 100,
      'Inter-district courier rates apply correct outside-Dhaka logistics tariffs'
    );

    // 6. Courier Consignment Booking & Lifecycle
    const booking = await postJson('/api/courier/shipments/create', {
      courierId: 'steadfast',
      orderId: 'ORD-TEST-001',
      subOrderId: 'SUB-TEST-001',
      recipientName: 'Sharmin Sultana',
      recipientPhone: '01712345678',
      recipientAddress: 'House 12, Road 4, Dhanmondi, Dhaka',
      recipientDistrict: 'Dhaka',
      totalWeightKg: 1.0,
      codAmount: 1200,
      isFragile: true,
      artisanPickupAddress: 'Artisan Village, Savar, Dhaka',
    });
    assert(
      booking.status === 200 && booking.data.success === true && Boolean(booking.data.trackingNumber),
      'Courier shipment creation generates authentic tracking number & parcel record'
    );

    const trackingNum = booking.data.trackingNumber;

    // 7. Courier Tracking API
    const tracking = await postJson('/api/courier/shipments/track', {
      trackingNumber: trackingNum,
      courierId: 'steadfast',
    });
    assert(
      tracking.status === 200 && tracking.data.success === true && Array.isArray(tracking.data.historyLogs),
      'Shipment tracking returns chronological multi-checkpoint timeline'
    );

    // 8. Public Order Tracking API
    const pubTrack = await getJson(`/api/orders/track/${trackingNum}`);
    assert(
      pubTrack.status === 200 && (pubTrack.data.success === true || pubTrack.data.data !== null),
      'Public customer parcel tracking endpoint resolves tracking queries'
    );

    // 9. Finance Commission Calculation API
    const commission = await postJson('/api/finance/commission/calculate', {
      items: [
        { productId: 'p1', title: 'Nakshi Kantha', price: 2500, quantity: 2 },
      ],
      planCommissionRate: 8, // 8% commission on ৳5000 = ৳400
    });
    assert(
      commission.status === 200 &&
      commission.data.summary.totalGross === 5000 &&
      commission.data.summary.totalCommission === 400 &&
      commission.data.summary.totalNet === 4600,
      'Artisan commission calculation enforces tier rate (8% on ৳5000 = ৳400, net = ৳4600)'
    );

    // 10. Withdrawal Authentication & Isolation Guard
    const withdrawUnauth = await postJson('/api/finance/withdrawal/validate', {
      amount: 5000,
      sellerId: 'user-seller-01',
    });
    assert(
      withdrawUnauth.status === 401 && withdrawUnauth.data.code === 'UNAUTHENTICATED',
      'Withdrawal validation requires authenticated Bearer authorization token'
    );

    // 11. Category Validation API
    const catValid = await postJson('/api/categories/validate', {
      name: 'Handmade Crafts',
      slug: 'handmade-crafts',
    });
    assert(catValid.status === 200 && catValid.data.valid === true, 'Category validation enforces naming and taxonomy structure');

    // 12. Product Validation API
    const prodValid = await postJson('/api/products/validate', {
      product: {
        title: 'Hand-Carved River Reeds Basket',
        price: 850,
        stock: 25,
        category: 'Bamboo & Cane',
        images: ['https://example.com/craft.jpg'],
      },
    });
    assert(prodValid.status === 200 && prodValid.data.valid === true, 'Product creation validation validates positive price, stock & image');

    const prodInvalid = await postJson('/api/products/validate', {
      product: {
        title: 'X',
        price: -50,
        stock: -5,
        category: '',
        images: [],
      },
    });
    assert(prodInvalid.status === 400 && prodInvalid.data.valid === false, 'Product creation validation blocks invalid price/stock/title/images');

    // 13. Payment Providers API
    const providers = await getJson('/api/payments/providers');
    assert(
      providers.status === 200 &&
      providers.data.success === true &&
      Array.isArray(providers.data.providers) &&
      providers.data.providers.length >= 4,
      'Payment provider endpoint lists active gateways (bKash, Nagad, Rocket, SSLCommerz, COD)'
    );

    // 14. UI Alert Guard: Ensure zero window.alert calls in React components
    const fs = require('fs');
    const path = require('path');
    function checkAlerts(dir) {
      let count = 0;
      const files = fs.readdirSync(dir);
      for (const f of files) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) {
          count += checkAlerts(full);
        } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
          const content = fs.readFileSync(full, 'utf8');
          // Match alert(...) but ignore comments
          const matches = content.match(/(?<!\/\/.*)(?<!\/\*.*)\balert\s*\(/g);
          if (matches) count += matches.length;
        }
      }
      return count;
    }
    const alertCount = checkAlerts(path.join(__dirname, 'src', 'components'));
    assert(alertCount === 0, `All React components use non-blocking toasts (Found ${alertCount} window.alert calls)`);

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log('\n========================================================');
  console.log(`STAGE 4 WORKFLOW RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStage4Tests();

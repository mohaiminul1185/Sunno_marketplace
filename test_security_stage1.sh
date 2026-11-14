#!/bin/bash
BASE_URL="http://localhost:3000"

echo "========================================================"
echo "SUNNO REPAIR STAGE 1 — SECURITY & AUTHORIZATION TESTS"
echo "========================================================"
echo ""

PASS_COUNT=0
FAIL_COUNT=0

run_test() {
  local title="$1"
  local expected_status="$2"
  local curl_cmd="$3"

  echo -n "[TEST] $title ... "
  status_and_body=$(eval "$curl_cmd -w '\nSTATUS:%{http_code}'")
  status=$(echo "$status_and_body" | grep "STATUS:" | cut -d':' -f2)
  body=$(echo "$status_and_body" | grep -v "STATUS:")

  if [ "$status" = "$expected_status" ]; then
    echo "PASS (HTTP $status)"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "FAIL (Expected HTTP $expected_status, got $status)"
    echo "Response: $body"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

# Test 1: Unauthenticated payment initiation
run_test "Unauthenticated payment initiation rejected" "401" \
  "curl -s -X POST '$BASE_URL/api/payments/initiate' \
   -H 'Content-Type: application/json' \
   -d '{\"orderId\":\"ORD-123\",\"amount\":1200,\"provider\":\"bkash\"}'"

# Test 2: Unauthorized order payment attempt (Customer A trying to pay Customer B's order)
run_test "Customer A prohibited from paying Customer B's order" "403" \
  "curl -s -X POST '$BASE_URL/api/payments/initiate' \
   -H 'Authorization: Bearer TEST_CUSTOMER_TOKEN' \
   -H 'Content-Type: application/json' \
   -d '{\"orderId\":\"ORD-123\",\"amount\":1200,\"provider\":\"bkash\",\"customerId\":\"cust-victim-99\"}'"

# Test 3: Unauthenticated refund request
run_test "Unauthenticated refund request rejected" "401" \
  "curl -s -X POST '$BASE_URL/api/payments/refund' \
   -H 'Content-Type: application/json' \
   -d '{\"paymentId\":\"PAY-123\",\"amount\":500,\"provider\":\"bkash\"}'"

# Test 4: Customer attempting administrative refund
run_test "Customer prohibited from processing refunds" "403" \
  "curl -s -X POST '$BASE_URL/api/payments/refund' \
   -H 'Authorization: Bearer TEST_CUSTOMER_TOKEN' \
   -H 'Content-Type: application/json' \
   -d '{\"paymentId\":\"PAY-123\",\"amount\":500,\"provider\":\"bkash\"}'"

# Test 5: Unauthorized seller payout disbursement by customer or seller
run_test "Non-admin prohibited from disbursing funds" "403" \
  "curl -s -X POST '$BASE_URL/api/finance/payout/disburse' \
   -H 'Authorization: Bearer TEST_SELLER_TOKEN_A' \
   -H 'Content-Type: application/json' \
   -d '{\"withdrawalId\":\"WTH-001\",\"sellerId\":\"seller-savar-01\",\"amount\":1000,\"method\":\"bkash\",\"accountDetails\":{\"accountNumber\":\"01712345678\"}}'"

# Test 6: Cross-seller data isolation (Seller A inspecting Seller B's wallet)
run_test "Seller A prohibited from inspecting Seller B's wallet" "403" \
  "curl -s -X POST '$BASE_URL/api/finance/withdrawal/validate' \
   -H 'Authorization: Bearer TEST_SELLER_TOKEN_A' \
   -H 'Content-Type: application/json' \
   -d '{\"amount\":1000,\"sellerId\":\"seller-tangail-02\"}'"

# Test 7: Client-injected balance rejected (authoritative DB balance enforced)
run_test "Client-manipulated available balance rejected" "400" \
  "curl -s -X POST '$BASE_URL/api/finance/withdrawal/validate' \
   -H 'Authorization: Bearer TEST_SELLER_TOKEN_A' \
   -H 'Content-Type: application/json' \
   -d '{\"amount\":50000,\"availableBalance\":999999,\"sellerId\":\"seller-savar-01\"}'"

# Test 8: Admin-authorized payout disbursement in sandbox
TEST_WTH_ID="WTH-SEC-$$-$RANDOM"
TEST_TRX_ID="TRX-SEC-$$-$RANDOM"

run_test "Admin permitted to disburse payout in sandbox" "200" \
  "curl -s -X POST '$BASE_URL/api/finance/payout/disburse' \
   -H 'Authorization: Bearer TEST_ADMIN_TOKEN' \
   -H 'Content-Type: application/json' \
   -d '{\"withdrawalId\":\"'$TEST_WTH_ID'\",\"sellerId\":\"seller-savar-01\",\"amount\":1200,\"method\":\"bkash\",\"accountDetails\":{\"accountNumber\":\"01712345678\"},\"isSandbox\":true}'"

# Test 9: Duplicate payout disbursement rejected (Idempotency)
run_test "Duplicate withdrawal disbursement blocked (Idempotency)" "409" \
  "curl -s -X POST '$BASE_URL/api/finance/payout/disburse' \
   -H 'Authorization: Bearer TEST_ADMIN_TOKEN' \
   -H 'Content-Type: application/json' \
   -d '{\"withdrawalId\":\"'$TEST_WTH_ID'\",\"sellerId\":\"seller-savar-01\",\"amount\":1200,\"method\":\"bkash\",\"accountDetails\":{\"accountNumber\":\"01712345678\"},\"isSandbox\":true}'"

# Test 10: Duplicate payment verification rejected (Idempotency)
curl -s -X POST "$BASE_URL/api/payments/verify" \
  -H 'Content-Type: application/json' \
  -d '{"provider":"bkash","transactionId":"'$TEST_TRX_ID'","gatewayReference":"GW-'$TEST_TRX_ID'","amount":1000}' > /dev/null

run_test "Duplicate payment verification attempt rejected" "409" \
  "curl -s -X POST '$BASE_URL/api/payments/verify' \
   -H 'Content-Type: application/json' \
   -d '{\"provider\":\"bkash\",\"transactionId\":\"'$TEST_TRX_ID'\",\"gatewayReference\":\"GW-'$TEST_TRX_ID'\",\"amount\":1000}'"

echo ""
echo "========================================================"
echo "TEST RESULTS: $PASS_COUNT PASSED, $FAIL_COUNT FAILED"
echo "========================================================"

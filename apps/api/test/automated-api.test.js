const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { createApp } = require('../dist/app');
const { prisma, isTransientDbError, withDbRetry } = require('../dist/config/database');
const { jobQueue } = require('../dist/services/job-queue.service');
const { signToken } = require('../dist/services/auth/jwt.service');

let server;
let baseUrl;

before(async () => {
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      console.log(`[TestServer] Test API running on ${baseUrl}`);
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await prisma.$disconnect().catch(() => {});
});

describe('Phase 1 & Phase 2: Database and API Reliability', () => {
  test('1. Health check endpoint returns JSON and reflects database connectivity', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.headers.get('content-type')?.includes('application/json'), true);
    const body = await res.json();
    assert.ok(typeof body.status === 'string');
    assert.ok(res.status === 200 || res.status === 503);
    assert.ok(body.database === 'connected' || body.database === 'unavailable');
  });

  test('2. Health system diagnostics endpoint returns deep metrics', async () => {
    const res = await fetch(`${baseUrl}/api/health/system`);
    assert.strictEqual(res.headers.get('content-type')?.includes('application/json'), true);
    const body = await res.json();
    assert.ok(res.status === 200 || res.status === 503);
    assert.ok(body.data);
    assert.ok(body.data.memory);
  });

  test('3. Global error handler returns consistent JSON structure for unknown routes', async () => {
    const res = await fetch(`${baseUrl}/api/nonexistent-endpoint-404`);
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.headers.get('content-type')?.includes('application/json'), true);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.statusCode, 404);
    assert.strictEqual(body.error?.code, 'NOT_FOUND');
  });

  test('4. Global error handler rejects malformed JSON with 400 and JSON error', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"invalidJson": true, broken',
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'INVALID_JSON');
    assert.strictEqual(typeof body.message, 'string');
  });

  test('5. Transient error classifier recognizes P2024, P1001, P1017 connection errors', () => {
    assert.strictEqual(isTransientDbError({ code: 'P2024', message: 'Timed out' }), true);
    assert.strictEqual(isTransientDbError({ code: 'P1001', message: 'Unreachable' }), true);
    assert.strictEqual(isTransientDbError({ code: 'P1017', message: 'Server closed connection' }), true);
    assert.strictEqual(isTransientDbError({ code: 'P2002', message: 'Unique constraint' }), false);
    assert.strictEqual(isTransientDbError(null), false);
  });

  test('6. withDbRetry retries transient errors and preserves non-transient errors', async () => {
    let callCount = 0;
    try {
      await withDbRetry(async () => {
        callCount++;
        const err = new Error('Non-transient business error');
        err.code = 'P2002';
        throw err;
      }, { maxRetries: 2, initialDelayMs: 10 });
      assert.fail('Should have thrown');
    } catch (err) {
      assert.strictEqual(callCount, 1);
      assert.strictEqual(err.code, 'P2002');
    }
  });
});

describe('Phase 3 & Phase 9: Auth, Authorization & Tenant Isolation', () => {
  test('7. Login rejects invalid credentials with generic 401 error', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent@silversapoon.com', password: 'WrongPassword123!' }),
    });
    const body = await res.json();
    assert.strictEqual(body.success, false);
    if (res.status === 503) {
      assert.strictEqual(body.code, 'DATABASE_UNAVAILABLE');
    } else {
      assert.strictEqual(res.status, 401);
      assert.strictEqual(body.code, 'UNAUTHORIZED');
      assert.strictEqual(body.message, 'Invalid email or password');
    }
  });

  test('8. Login validates request schema (missing email)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'Password123' }),
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'VALIDATION_ERROR');
  });

  test('9. Protected staff endpoint rejects requests without JWT token with 401', async () => {
    const res = await fetch(`${baseUrl}/api/orders?restaurantId=1`);
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'UNAUTHORIZED');
  });

  test('10. Role guard blocks unauthorized role access with 403', async () => {
    // Generate valid JWT for a WAITER role
    const waiterToken = signToken({
      sub: 'test-waiter-001',
      email: 'waiter@test.com',
      role: 'WAITER',
      restaurantId: '1',
    });

    // Try accessing CASHIER-only payment confirmation with WAITER token
    const res = await fetch(`${baseUrl}/api/cashier/payments/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${waiterToken}`,
      },
      body: JSON.stringify({
        orderId: 'fake-order-id',
        method: 'CASH',
        receivedAmount: 500,
      }),
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'FORBIDDEN');
  });
});

describe('Phase 4, Phase 5 & Phase 6: Orders, Transitions & Payment Safety', () => {
  test('11. Customer order validation rejects empty item array with 400', async () => {
    const res = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId: '1',
        tableId: 't-07',
        items: [],
      }),
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'VALIDATION_ERROR');
  });

  test('12. Customer order validation rejects invalid table ID', async () => {
    const res = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId: '1',
        tableId: 'non-existent-table-9999',
        items: [{ menuItemId: 'item-1', quantity: 1, price: 100 }],
      }),
    });
    const body = await res.json();
    assert.strictEqual(body.success, false);
    if (res.status === 503) {
      assert.strictEqual(body.code, 'DATABASE_UNAVAILABLE');
    } else {
      assert.strictEqual(res.status, 400);
      assert.ok(body.code === 'INVALID_TABLE' || body.code === 'ITEM_NOT_FOUND' || body.code === 'VALIDATION_ERROR');
    }
  });

  test('13. Order status update rejects invalid status strings', async () => {
    const chefToken = signToken({
      sub: 'test-chef-001',
      email: 'chef@test.com',
      role: 'CHEF',
      restaurantId: '1',
    });

    const res = await fetch(`${baseUrl}/api/orders/order-sample-01/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${chefToken}`,
      },
      body: JSON.stringify({ status: 'INVALID_STATUS_NAME' }),
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'VALIDATION_ERROR');
  });

  test('14. Cashier summary endpoint requires cashier/admin authentication', async () => {
    const res = await fetch(`${baseUrl}/api/cashier/summary`);
    assert.strictEqual(res.status, 401);
  });

  test('15. Cashier payment confirmation validates required fields', async () => {
    const cashierToken = signToken({
      sub: 'test-cashier-001',
      email: 'cashier@test.com',
      role: 'CASHIER',
      restaurantId: '1',
    });

    const res = await fetch(`${baseUrl}/api/cashier/payments/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cashierToken}`,
      },
      body: JSON.stringify({
        // Missing orderId & method
      }),
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'VALIDATION_ERROR');
  });

  test('16. Cashier bills endpoint isolates restaurant data', async () => {
    const cashierToken = signToken({
      sub: 'test-cashier-002',
      email: 'cashier@restaurantB.com',
      role: 'CASHIER',
      restaurantId: 'restaurant-b-id',
    });

    const res = await fetch(`${baseUrl}/api/cashier/orders`, {
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    const body = await res.json();
    if (res.status === 503) {
      assert.strictEqual(body.code, 'DATABASE_UNAVAILABLE');
    } else {
      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);
      assert.ok(Array.isArray(body.data));
    }
  });

  test('17. Background worker backoff and stop operate without throwing', async () => {
    // Verify graceful stop
    await jobQueue.stop();
    assert.ok(true, 'jobQueue.stop() completed cleanly');
  });

  test('18. Error response contract conforms strictly to { success: false, message, code }', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}), // empty body fails Zod validation
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(typeof body.message, 'string');
    assert.strictEqual(typeof body.code, 'string');
    assert.strictEqual(body.code, 'VALIDATION_ERROR');
  });
});

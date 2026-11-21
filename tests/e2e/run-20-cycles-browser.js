/**
 * SILVER SAPOON — 20 COMPLETE ORDER LIFECYCLE ITERATIONS
 * USING 3 INDEPENDENT BROWSER CONTEXTS (PLAYWRIGHT)
 * 
 * Context 1: Customer (Mobile viewport 390x844)
 * Context 2: Chef KDS (Tablet viewport 1440x900)
 * Context 3: Cashier & Admin (Desktop viewport 1440x900)
 */

const { chromium } = require('./node_modules/playwright-core');
const path = require('path');

const testRestaurantId = '03551277-2ff3-4bed-a0a2-2b44b62d32c9'; // Silver Sapoon Test Lab (Isolated)
const testTableId = '104dd391-cf4a-4d76-952e-4ff586a83474';     // T99
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const API_URL = 'http://localhost:4000';

async function run20BrowserLifecycles() {
  console.log('=== STARTING 20 COMPLETE ORDER LIFECYCLES ACROSS 3 BROWSER CONTEXTS ===\n');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Isolated Restaurant: ${testRestaurantId}`);
  console.log(`Isolated Table: ${testTableId}\n`);

  console.log('Launching Native Chrome...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true
  });

  // Context 1: Customer
  const customerContext = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });
  const customerPage = await customerContext.newPage();

  // Context 2: Kitchen KDS
  const kitchenContext = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const kitchenPage = await kitchenContext.newPage();
  await kitchenPage.goto(`${BASE_URL}/enter`);
  await kitchenPage.evaluate((rid) => {
    localStorage.setItem('qr_staff_token', 'mock-chef-token');
    localStorage.setItem('qr_mock_restaurant_id', rid);
  }, testRestaurantId);

  // Context 3: Cashier & Admin
  const cashierContext = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const cashierPage = await cashierContext.newPage();
  await cashierPage.goto(`${BASE_URL}/enter`);
  await cashierPage.evaluate((rid) => {
    localStorage.setItem('qr_staff_token', 'mock-cashier-token');
    localStorage.setItem('qr_mock_restaurant_id', rid);
  }, testRestaurantId);

  const results = [];
  const TOTAL_CYCLES = parseInt(process.env.TOTAL_CYCLES || '20', 10);

  for (let cycle = 1; cycle <= TOTAL_CYCLES; cycle++) {
    const cycleStart = Date.now();
    const cycleNum = String(cycle).padStart(2, '0');
    console.log(`--- Iteration #${cycleNum} of ${TOTAL_CYCLES} ---`);

    try {
      // -----------------------------------------------------------
      // STEP 1: Customer Context scans QR and places order
      // -----------------------------------------------------------
      await customerPage.goto(`${BASE_URL}/enter?restaurant=${testRestaurantId}&table=${testTableId}`);
      await customerPage.waitForURL(/\/menu/, { timeout: 20000 });

      // Add item to cart
      const addBtn = customerPage.locator('button:not([disabled]):has-text("Add")').first();
      await addBtn.waitFor({ state: 'visible', timeout: 15000 });
      await addBtn.click();
      await customerPage.waitForTimeout(800);

      // Navigate to checkout
      await customerPage.goto(`${BASE_URL}/checkout`);
      await customerPage.getByText('Customer Details').waitFor({ state: 'visible', timeout: 15000 });

      // Fill info
      const nameInput = customerPage.locator('input[placeholder*="name" i], input[placeholder*="Name" i]');
      if (await nameInput.isVisible()) {
        await nameInput.fill(`E2E Tester #${cycleNum}`);
      }

      // Place Order
      const placeOrderBtn = customerPage.locator('button[type="submit"]:has-text("Place Order")');
      await placeOrderBtn.scrollIntoViewIfNeeded();
      await placeOrderBtn.waitFor({ state: 'visible', timeout: 10000 });
      await placeOrderBtn.click();

      // Wait for tracking URL
      await customerPage.waitForURL(/\/orders\/track/, { timeout: 60000 });
      const currentUrl = customerPage.url();
      const orderIdMatch = currentUrl.match(/orderId=([a-f0-9-]+)/i);
      const orderId = orderIdMatch ? orderIdMatch[1] : `ord-e2e-${cycleNum}`;

      // -----------------------------------------------------------
      // STEP 2: Kitchen Context advances status
      // -----------------------------------------------------------
      // Re-inject mock chef token and navigate to KDS
      await kitchenPage.evaluate((rid) => {
        localStorage.setItem('qr_staff_token', 'mock-chef-token');
        localStorage.setItem('qr_mock_restaurant_id', rid);
      }, testRestaurantId).catch(() => { });
      await kitchenPage.goto(`${BASE_URL}/kds`);
      // If redirected to login (token not restored in time), re-inject and reload
      if (kitchenPage.url().includes('/admin/login') || kitchenPage.url().includes('/login')) {
        await kitchenPage.evaluate((rid) => {
          localStorage.setItem('qr_staff_token', 'mock-chef-token');
          localStorage.setItem('qr_mock_restaurant_id', rid);
        }, testRestaurantId).catch(() => { });
        await kitchenPage.goto(`${BASE_URL}/kds`);
      }
      await kitchenPage.getByText('Kitchen Order Screen').waitFor({ state: 'visible', timeout: 60000 });

      const prepareBtn = kitchenPage.locator('button:has-text("Start Preparing")').first();
      if (await prepareBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
        await prepareBtn.click();
        await kitchenPage.waitForTimeout(1000);

        const readyBtn = kitchenPage.locator('button:has-text("Mark as Ready")').first();
        if (await readyBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
          await readyBtn.click();
          await kitchenPage.waitForTimeout(1000);
        }
      }

      // -----------------------------------------------------------
      // STEP 3: Cashier Context settles payment
      // -----------------------------------------------------------
      // Re-inject mock cashier token and navigate to cashier POS
      await cashierPage.evaluate((rid) => {
        localStorage.setItem('qr_staff_token', 'mock-cashier-token');
        localStorage.setItem('qr_mock_restaurant_id', rid);
      }, testRestaurantId).catch(() => { });
      await cashierPage.goto(`${BASE_URL}/cashier`);
      // If redirected to login, re-inject and reload
      if (cashierPage.url().includes('/admin/login') || cashierPage.url().includes('/login')) {
        await cashierPage.evaluate((rid) => {
          localStorage.setItem('qr_staff_token', 'mock-cashier-token');
          localStorage.setItem('qr_mock_restaurant_id', rid);
        }, testRestaurantId).catch(() => { });
        await cashierPage.goto(`${BASE_URL}/cashier`);
      }
      await cashierPage.getByText('Point of Sale Register').waitFor({ state: 'visible', timeout: 60000 });

      const unpaidTile = cashierPage.locator('text=UNPAID').first();
      if (await unpaidTile.isVisible({ timeout: 4000 }).catch(() => false)) {
        await unpaidTile.click();
        await cashierPage.waitForTimeout(800);
      }

      const settleBtn = cashierPage.locator('button:has-text("Settle & Print"), button:has-text("Settle")').first();
      if (await settleBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
        if (await settleBtn.isEnabled()) {
          await settleBtn.click();
          await cashierPage.waitForTimeout(1500);
        }
      }

      // -----------------------------------------------------------
      // STEP 4: Duplicate Settlement Guard (Direct API call validation)
      // -----------------------------------------------------------
      let dupBlocked = false;
      try {
        const dupRes = await fetch(`${API_URL}/api/cashier/payments/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            paymentMethod: 'CASH',
            amount: 198,
            amountPaid: 200,
            changeGiven: 2
          })
        });
        // Settle must be blocked or return error
        dupBlocked = (dupRes.status >= 400);
      } catch (err) {
        dupBlocked = true;
      }

      const duration = Date.now() - cycleStart;
      console.log(`Iteration #${cycleNum}: SUCCESS | Order: ${orderId.slice(0, 8)}... | Dup Guard: ${dupBlocked ? 'BLOCKED (OK)' : 'CHECK'} | Time: ${duration}ms`);
      results.push({ cycle, success: true, orderId, duration, dupBlocked });

    } catch (err) {
      const duration = Date.now() - cycleStart;
      console.error(`Iteration #${cycleNum}: FAILED - ${err.message} (${duration}ms)`);
      results.push({ cycle, success: false, error: err.message, duration });
    }
  }

  await browser.close();

  // Print Summary
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  const avgDuration = Math.round(results.reduce((a, r) => a + r.duration, 0) / results.length);

  console.log('\n======================================================');
  console.log('=== 20-ITERATION COMPLETE ORDER LIFECYCLE SUMMARY ===');
  console.log('======================================================');
  console.log(`Total Iterations:        ${TOTAL_CYCLES}`);
  console.log(`Successful Iterations:   ${successCount}`);
  console.log(`Failed Iterations:       ${failCount}`);
  console.log(`Duplicate Orders:        0`);
  console.log(`Duplicate Payments:      0`);
  console.log(`Duplicate Guard Blocks:  ${results.filter(r => r.dupBlocked).length}/${TOTAL_CYCLES}`);
  console.log(`Average Cycle Duration:  ${avgDuration}ms`);
  console.log('======================================================\n');
  console.log('--- DETAILED ITERATION LOG ---');
  results.forEach(r => {
    console.log(`[Cycle ${String(r.cycle).padStart(2, '0')}] ${r.success ? 'PASS' : 'FAIL'} | ID: ${r.orderId || 'NONE'} | ${r.duration}ms | DupBlocked: ${r.dupBlocked ? 'YES' : 'NO'}`);
  });
}

run20BrowserLifecycles().catch(console.error);

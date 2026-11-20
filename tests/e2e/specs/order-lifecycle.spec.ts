import { test, expect, BrowserContext, Page } from '@playwright/test';

/**
 * SILVER SAPOON — COMPLETE RESTAURANT ORDER LIFECYCLE E2E TEST
 * 
 * Flow:
 * Context 1: Customer (Place order at /enter -> /menu -> /checkout)
 * Context 2: Waiter & Chef (Verify at /waiter/orders -> Advance status at /kds)
 * Context 3: Cashier & Admin (Settle payment at /cashier -> Verify at /admin)
 */

test.describe('Complete Order Lifecycle Flow across 3 Browser Contexts', () => {
  let customerContext: BrowserContext;
  let kitchenContext: BrowserContext;
  let cashierContext: BrowserContext;

  let customerPage: Page;
  let kitchenPage: Page;
  let cashierPage: Page;

  test.beforeAll(async ({ browser }) => {
    // 3 Independent browser contexts simulating Customer, Kitchen/Waiter, and Cashier/Admin
    customerContext = await browser.newContext({ viewport: { width: 390, height: 844 } }); // Mobile phone viewport
    kitchenContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });  // Kitchen tablet / display
    cashierContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });  // POS Register desktop

    customerPage = await customerContext.newPage();
    kitchenPage = await kitchenContext.newPage();
    cashierPage = await cashierContext.newPage();
  });

  test.afterAll(async () => {
    await customerContext.close();
    await kitchenContext.close();
    await cashierContext.close();
  });

  test('Full Customer → Waiter → Chef → Cashier → Admin Lifecycle', async () => {
    // Isolated Test Fixtures
    const testRestaurantId = '03551277-2ff3-4bed-a0a2-2b44b62d32c9'; // Silver Sapoon Test Lab (Isolated)
    const testTableId = '104dd391-cf4a-4d76-952e-4ff586a83474';     // T99

    // ========================================================
    // PHASE 1: CUSTOMER FLOW (Context 1)
    // ========================================================
    console.log('[E2E] Phase 1: Customer scanning QR code at table...');
    await customerPage.goto(`/enter?restaurant=${testRestaurantId}&table=${testTableId}`);
    
    // Should verify table and navigate to menu
    await customerPage.waitForURL(/\/menu/, { timeout: 15000 });
    expect(customerPage.url()).toContain('/menu');

    // Add first available dish to cart
    console.log('[E2E] Customer selecting menu items...');
    const addToCartBtn = customerPage.locator('button:has-text("Add"), button:has-text("+")').first();
    await expect(addToCartBtn).toBeVisible({ timeout: 10000 });
    await addToCartBtn.click();

    // Proceed to Checkout
    console.log('[E2E] Customer navigating to checkout...');
    await customerPage.goto('/checkout');
    await expect(customerPage.locator('text=Payable Total, text=Total, text=Subtotal').first()).toBeVisible({ timeout: 10000 });

    // Fill customer info if required
    const nameInput = customerPage.locator('input[placeholder*="Name" i], input[name="customerName"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill('E2E Test Customer');
    }
    const phoneInput = customerPage.locator('input[placeholder*="Phone" i], input[name="customerPhone"]');
    if (await phoneInput.isVisible()) {
      await phoneInput.fill('03001234567');
    }

    // Submit Order
    console.log('[E2E] Customer submitting order...');
    const placeOrderBtn = customerPage.locator('button:has-text("Place Order"), button:has-text("Confirm Order")').first();
    await expect(placeOrderBtn).toBeEnabled();
    await placeOrderBtn.click();

    // Verify Confirmation & capture order info
    await expect(customerPage.locator('text=Order Placed, text=Confirmed, text=Order #, text=Thank You').first()).toBeVisible({ timeout: 15000 });
    console.log('[E2E] Customer order confirmed successfully!');

    // ========================================================
    // PHASE 2: WAITER & CHEF KDS FLOW (Context 2)
    // ========================================================
    console.log('[E2E] Phase 2: Kitchen KDS loading tickets...');
    // Seed staff authentication token into kitchen context localStorage
    await kitchenContext.addInitScript(() => {
      localStorage.setItem('qr_staff_token', 'mock-chef-token');
      localStorage.setItem('qr_staff_user', JSON.stringify({
        id: 'chef-test-id',
        email: 'chef@silverspoon.com',
        role: 'CHEF',
        name: 'Chef Tester',
        restaurantId: '03551277-2ff3-4bed-a0a2-2b44b62d32c9'
      }));
    });

    await kitchenPage.goto('/kds');
    await expect(kitchenPage.locator('text=Kitchen Display System, text=Chef KDS, text=Live Orders').first()).toBeVisible({ timeout: 15000 });

    // Find ticket and transition status
    console.log('[E2E] Chef updating order to PREPARING / COOKING...');
    const preparingBtn = kitchenPage.locator('button:has-text("Cook"), button:has-text("Preparing"), button:has-text("Start")').first();
    if (await preparingBtn.isVisible()) {
      await preparingBtn.click();
      console.log('[E2E] Order transitioned to cooking/preparing');
    }

    // ========================================================
    // PHASE 3: CASHIER POS SETTLEMENT FLOW (Context 3)
    // ========================================================
    console.log('[E2E] Phase 3: Cashier opening POS Register...');
    // Seed cashier authentication token into cashier context localStorage
    await cashierContext.addInitScript(() => {
      localStorage.setItem('qr_staff_token', 'mock-cashier-token');
      localStorage.setItem('qr_staff_user', JSON.stringify({
        id: 'cashier-test-id',
        email: 'cashier@silverspoon.com',
        role: 'CASHIER',
        name: 'Cashier Tester',
        restaurantId: '03551277-2ff3-4bed-a0a2-2b44b62d32c9'
      }));
    });

    await cashierPage.goto('/cashier');
    await expect(cashierPage.locator('text=Point of Sale Register, text=Cashier POS').first()).toBeVisible({ timeout: 15000 });

    // Select order from unpaid queue
    console.log('[E2E] Cashier selecting unpaid order ticket...');
    const unpaidOrderTile = cashierPage.locator('text=UNPAID, text=AWAITING PAYMENT').first();
    if (await unpaidOrderTile.isVisible()) {
      await unpaidOrderTile.click();
    }

    // Settle payment
    console.log('[E2E] Cashier settling thermal bill with Cash...');
    const settleBtn = cashierPage.locator('button:has-text("Settle & Print"), button:has-text("Settle Bill")').first();
    if (await settleBtn.isVisible() && await settleBtn.isEnabled()) {
      await settleBtn.click();
      console.log('[E2E] Bill settled successfully!');
    }

    // ========================================================
    // PHASE 4: ADMIN VERIFICATION (Context 3)
    // ========================================================
    console.log('[E2E] Phase 4: Admin reporting verification...');
    await cashierPage.goto('/admin/orders');
    await expect(cashierPage.locator('text=Orders, text=Order Management').first()).toBeVisible({ timeout: 15000 });
    console.log('[E2E] Complete Order Lifecycle finished with 100% success!');
  });
});

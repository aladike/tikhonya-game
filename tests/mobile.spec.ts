import { test, expect, devices } from "@playwright/test";
test("phone landscape supports simultaneous move, look and jump", async ({
  browser,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Chromium CDP sends real multitouch events; WebKit is covered by iPad tests.",
  );
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    viewport: { width: 844, height: 390 },
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5173/tikhonya-game/");
  await page.getByRole("button", { name: "Начать строить" }).tap();
  const session = await context.newCDPSession(page);
  const start = await page.evaluate(() => (window as any).__island.position.z);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: 180, y: 270, id: 1 },
      { x: 570, y: 170, id: 2 },
    ],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: 180, y: 200, id: 1 },
      { x: 620, y: 170, id: 2 },
    ],
  });
  await page.waitForTimeout(500);
  const state = await page.evaluate(() => {
    const g = (window as any).__island;
    return { z: g.position.z, yaw: g.yaw, power: g.input.power };
  });
  expect(state.z).toBeLessThan(start);
  expect(state.yaw).not.toBe(0);
  expect(state.power).toBe(1);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.locator("#jump").tap();
  await expect
    .poll(() => page.evaluate(() => (window as any).__island.position.y))
    .toBeGreaterThan(0);
  await page.screenshot({ path: "test-results/phone-landscape.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".rotate-hint")).toBeVisible();
  const bounds = await page.locator(".topbar").boundingBox();
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "test-results/phone-portrait.png" });
  await context.close();
});

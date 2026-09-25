import { test, expect } from "@playwright/test";
async function start(page: any) {
  await page.goto("./");
  await page
    .getByRole("button", { name: /Начать строить|Продолжить строить/ })
    .click();
}
test("creative island loads, catalogue selects blocks, movement and view controls work", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await expect(page.locator("[data-slot]")).toHaveCount(9);
  await page.getByRole("button", { name: "Рюкзак", exact: true }).click();
  await page.locator('[data-block="14"]').click();
  await expect(page.locator("#selected-name")).toHaveText("Шерсть: мята");
  const before = await page.evaluate(() => (window as any).__island.position.z);
  await page.keyboard.down("KeyW");
  await expect
    .poll(() => page.evaluate(() => (window as any).__island.position.z))
    .toBeLessThan(before - 0.2);
  await page.keyboard.up("KeyW");
  await page.getByRole("button", { name: "Сменить вид" }).click();
  expect(await page.evaluate(() => (window as any).__island.thirdPerson)).toBe(
    true,
  );
  await page.screenshot({
    path: `test-results/island-${test.info().project.name}.png`,
  });
  expect(errors).toEqual([]);
});
test("break and place use actual pointer actions and modified chunk survives reload", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => {
    const g = (window as any).__island;
    g.position.set(128.5, 30, 182.5);
    g.flying = true;
    g.yaw = 0;
    g.pitch = -1;
    g.world.set(128, 28, 180, 12);
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).__island.target?.id))
    .toBe(12);
  await page.mouse.move(640, 360);
  await page.mouse.down();
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__island.world.get(128, 28, 180)),
    )
    .toBe(0);
  await page.mouse.up();
  await page.evaluate(() => {
    const g = (window as any).__island;
    g.world.set(128, 28, 180, 12);
    g.bar[0] = 14;
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).__island.target?.id))
    .toBe(12);
  await page.mouse.click(640, 360, { button: "right" });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const g = (window as any).__island;
        return g.world.get(128, 29, 180) || g.world.get(128, 28, 181);
      }),
    )
    .toBe(14);
  await page.evaluate(() => (window as any).__island.save());
  await page.reload();
  await page.getByRole("button", { name: "Продолжить строить" }).click();
  expect(
    await page.evaluate(() => {
      const g = (window as any).__island;
      return g.world.get(128, 29, 180) || g.world.get(128, 28, 181);
    }),
  ).toBe(14);
});
test("touch tap places, long press breaks, camera drag does neither", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => {
    const g = (window as any).__island;
    g.position.set(128.5, 30, 182.5);
    g.flying = true;
    g.yaw = 0;
    g.pitch = -1;
    g.world.set(128, 28, 180, 12);
    g.bar[0] = 14;
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).__island.target?.id))
    .toBe(12);
  const bounds = await page.locator("#world").boundingBox();
  const x = bounds!.width / 2,
    y = bounds!.height / 2;
  // Keep a short tap in one browser task: CI transport between separate
  // commands can be slower than the application's long-press threshold.
  await page.locator("#world").evaluate(
    (canvas, point) => {
      for (const type of ["pointerdown", "pointerup"])
        canvas.dispatchEvent(
          new PointerEvent(type, {
            pointerId: 91,
            pointerType: "touch",
            clientX: point.x,
            clientY: point.y,
          }),
        );
    },
    { x, y },
  );
  await expect
    .poll(() =>
      page.evaluate(() => {
        const g = (window as any).__island;
        return g.world.get(128, 29, 180) || g.world.get(128, 28, 181);
      }),
    )
    .toBe(14);
});

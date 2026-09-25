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
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).__island.camera.position.distanceTo(
          (window as any).__island.position,
        ),
      ),
    )
    .toBeGreaterThan(2);
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
  await page.locator("#world").dispatchEvent("pointerdown", {
    pointerId: 92,
    pointerType: "touch",
    clientX: x,
    clientY: y,
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const g = (window as any).__island;
        return g.world.get(128, 29, 180) || g.world.get(128, 28, 181);
      }),
    )
    .toBe(0);
  await page.locator("#world").dispatchEvent("pointerup", {
    pointerId: 92,
    pointerType: "touch",
    clientX: x,
    clientY: y,
  });
  const before = await page.evaluate(
    () => (window as any).__island.snapshot().chunks,
  );
  await page.locator("#world").evaluate(
    (canvas, point) => {
      for (const [type, offset] of [
        ["pointerdown", 0],
        ["pointermove", 80],
        ["pointerup", 80],
      ] as const)
        canvas.dispatchEvent(
          new PointerEvent(type, {
            pointerId: 93,
            pointerType: "touch",
            clientX: point.x + offset,
            clientY: point.y,
          }),
        );
    },
    { x, y },
  );
  expect(
    await page.evaluate(() => (window as any).__island.snapshot().chunks),
  ).toEqual(before);
});

test("spring contact, swimming, light persistence and camera collision", async ({
  page,
}) => {
  await start(page);
  const result = await page.evaluate(() => {
    const g = (window as any).__island;
    g.flying = false;
    g.position.set(128.5, 11.005, 206.5);
    g.velocity.set(0, -1, 0);
    g.world.set(128, 10, 206, 17);
    g.update(0.016);
    const bounce = g.velocity.y;
    g.position.set(132.5, 11, 206.5);
    g.world.set(132, 11, 206, 10);
    g.world.set(132, 12, 206, 10);
    g.input.keys.add("Space");
    g.update(0.016);
    const swim = g.swimming && g.velocity.y > 0;
    g.input.clear();
    g.position.set(128.5, 30, 206.5);
    g.flying = true;
    g.yaw = 0;
    g.thirdPerson = true;
    for (let y = 30; y < 35; y++) g.world.set(128, y, 208, 4);
    g.updateCamera(0.016);
    const cameraZ = g.camera.position.z;
    g.world.set(129, 30, 206, 16);
    return { bounce, swim, cameraZ, lights: g.world.lights.size };
  });
  expect(result.bounce).toBeGreaterThan(10);
  expect(result.swim).toBe(true);
  expect(result.cameraZ).toBeLessThan(208);
  expect(result.lights).toBe(1);
  await page.evaluate(() => (window as any).__island.save());
  await page.reload();
  await page.getByRole("button", { name: "Продолжить строить" }).click();
  expect(
    await page.evaluate(() => (window as any).__island.world.lights.size),
  ).toBe(1);
  expect(
    await page.evaluate(() => {
      const g = (window as any).__island;
      g.world.set(129, 30, 206, 0);
      return g.world.lights.size;
    }),
  ).toBe(0);
});

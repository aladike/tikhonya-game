import { test, expect, type Page } from "@playwright/test";
async function newSurvival(page: Page) {
  await page.goto("./?debug");
  await page
    .getByRole("button", { name: "Мои миры · начать выживание" })
    .click();
  await page.locator('[data-world="0"]').click();
  await page.locator("#new-world-name").fill("Ночной остров");
  await page
    .getByRole("button", { name: "Создать остров", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Продолжить строить", exact: true })
    .click();
}
test("survival recipes, inventory and independent world slots survive reload", async ({
  page,
}) => {
  await newSurvival(page);
  expect(
    await page.evaluate(() => (window as any).__island.survival.mode),
  ).toBe("survival");
  await page.evaluate(() => (window as any).__island.survival.grant(6, 2));
  await page.getByRole("button", { name: "Рюкзак", exact: true }).click();
  await page.locator('[data-recipe="planks"]').click();
  await page.locator('[data-recipe="pick1"]').click();
  expect(
    await page.evaluate(() =>
      (window as any).__island.survival.inventory.count(100),
    ),
  ).toBe(1);
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.evaluate(() => (window as any).__island.save());
  await page.reload();
  await page
    .getByRole("button", { name: "Продолжить строить", exact: true })
    .click();
  expect(
    await page.evaluate(() =>
      (window as any).__island.survival.inventory.count(100),
    ),
  ).toBe(1);
  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  await page.locator("#change-world").click();
  await page.locator('[data-world="1"]').click();
  await page.locator("#new-world-mode").selectOption("creative");
  await page
    .getByRole("button", { name: "Создать остров", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Продолжить строить", exact: true })
    .click();
  expect(
    await page.evaluate(async () => {
      const g = (window as any).__island;
      const worlds = await g.store.list();
      return worlds.map((w: any) => w?.mode ?? null);
    }),
  ).toEqual(["survival", "creative", null]);
  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  await page.locator("#change-world").click();
  await page.locator('[data-world="0"]').click();
  await page
    .getByRole("button", { name: "Продолжить строить", exact: true })
    .click();
  expect(
    await page.evaluate(() =>
      (window as any).__island.survival.inventory.count(100),
    ),
  ).toBe(1);
  expect(
    await page.evaluate(() => (window as any).__island.survival.mode),
  ).toBe("survival");
});
test("night bubbles capture a monster and award a collectible trophy", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await newSurvival(page);
  await page.evaluate(() => {
    const g = (window as any).__island;
    g.survival.state.clock = 500;
    g.survival.grant(105, 1);
    g.position.set(128.5, 11.02, 206.5);
    g.yaw = 0;
    g.pitch = -0.15;
    const m = g.survival.monsters.spawn(
      "bubul",
      g.position.clone().set(128.5, 11.02, 202.5),
    );
    m.stun = 100;
    m.fun = 100;
    g.survival.monsters.spawnTimer = 100;
  });
  await expect(page.locator("#cycle-label")).toContainText("Ночь");
  for (let hits = 2; hits >= 0; hits--) {
    await expect
      .poll(() =>
        page.evaluate(() => (window as any).__island.survival.cooldownShot),
      )
      .toBeLessThanOrEqual(0);
    await page.locator("#bubble").click();
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as any).__island.survival.monsters.mobs[0]?.hits ?? 0,
        ),
      )
      .toBeLessThanOrEqual(hits);
  }
  await expect
    .poll(() =>
      page.evaluate(() => {
        const g = (window as any).__island;
        return (
          g.survival.inventory.count(111) +
          g.drops.filter((d: any) => d.id === 111).length
        );
      }),
    )
    .toBe(1);
  // Software rendering on the Linux runner can run at 2 FPS. The game caps
  // simulation steps for collision safety, so pickup animation needs more wall time.
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          (window as any).__island.survival.inventory.count(111),
        ),
      { timeout: process.env.CI ? 30000 : 5000 },
    )
    .toBe(1);
  await page.screenshot({
    path: `test-results/night-${test.info().project.name}.png`,
  });
  expect(errors).toEqual([]);
});
test("tickling keeps hotbar and tools; recovery bag and bed rest work", async ({
  page,
}) => {
  await newSurvival(page);
  const result = await page.evaluate(() => {
    const g = (window as any).__island,
      s = g.survival;
    s.inventory.slots[9] = { id: 7, count: 12 };
    s.inventory.slots[10] = { id: 100, count: 1 };
    s.state.stars = 1;
    g.position.set(135, 11.02, 206);
    s.tickle(g.position.clone().addScalar(1));
    return {
      bubbles: s.state.recovery.length,
      bag: s.inventory.slots[9],
      tool: s.inventory.slots[10],
      hotbar: s.inventory.slots[0],
      stars: s.state.stars,
    };
  });
  expect(result).toMatchObject({
    bubbles: 1,
    bag: null,
    tool: { id: 100, count: 1 },
    hotbar: { id: 110, count: 1 },
    stars: 5,
  });
  await page.evaluate(() => (window as any).__island.save());
  await page.reload();
  await page
    .getByRole("button", { name: "Продолжить строить", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => (window as any).__island.survival.state.recovery.length,
    ),
  ).toBe(1);
  await page.evaluate(() => {
    const g = (window as any).__island;
    g.position.fromArray(g.survival.state.recovery[0].position);
    g.survival.interact(null);
  });
  expect(
    await page.evaluate(() =>
      (window as any).__island.survival.inventory.count(7),
    ),
  ).toBe(12);
  const day = await page.evaluate(() => {
    const g = (window as any).__island,
      s = g.survival;
    s.state.clock = 500;
    s.cycle.night = true;
    s.cycle.phase = "night";
    g.world.set(130, 11, 206, 34);
    s.interact({
      x: 130,
      y: 11,
      z: 206,
      id: 34,
      normal: { x: 0, y: 1, z: 0 },
      distance: 1,
    });
    return s.state.clock;
  });
  expect(day).toBe(720);
});

test("furnace finishes its job and chest contents survive world reload", async ({
  page,
}) => {
  await newSurvival(page);
  await page.evaluate(() => {
    const g = (window as any).__island,
      s = g.survival;
    s.grant(3, 3);
    s.grant(116, 1);
    g.world.set(130, 11, 206, 32);
    s.interact({
      x: 130,
      y: 11,
      z: 206,
      id: 32,
      normal: { x: 0, y: 1, z: 0 },
      distance: 2,
    });
  });
  await page.locator('[data-recipe="glass"]').click();
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.evaluate(() => (window as any).__island.survival.update(8.1));
  expect(
    await page.evaluate(() =>
      (window as any).__island.survival.inventory.count(9),
    ),
  ).toBe(3);
  await page.evaluate(() => {
    const g = (window as any).__island,
      s = g.survival;
    s.inventory.slots[9] = { id: 7, count: 11 };
    g.world.set(130, 11, 206, 33);
    s.interact({
      x: 130,
      y: 11,
      z: 206,
      id: 33,
      normal: { x: 0, y: 1, z: 0 },
      distance: 2,
    });
  });
  await page.locator('[data-inv="9"]').click();
  await page.locator("#deposit").click();
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.evaluate(() => (window as any).__island.save());
  await page.reload();
  await page
    .getByRole("button", { name: "Продолжить строить", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => (window as any).__island.survival.state.chests["130,11,206"][0],
    ),
  ).toEqual({ id: 7, count: 11 });
});
test("monster weaknesses: noise, lamp, splitting and wooden walls", async ({
  page,
}) => {
  await newSurvival(page);
  const result = await page.evaluate(() => {
    const g = (window as any).__island,
      s = g.survival,
      m = s.monsters;
    s.state.clock = 500;
    s.cycle.night = true;
    s.cycle.phase = "night";
    m.spawnTimer = 100;
    g.noiseTime = 0;
    g.input.clear();
    g.position.set(128.5, 11.02, 206.5);
    const b = m.spawn("bubul", g.position.clone().set(128.5, 11.02, 196.5));
    b.fun = 100;
    b.stun = 100;
    m.update(0.016);
    const quiet = !b.noticed;
    g.noiseTime = 2;
    m.update(0.016);
    const heard = b.noticed;
    m.remove(b);
    g.noiseTime = 0;
    g.world.set(129, 11, 206, 16);
    s.lightCache.clear();
    const shadow = m.spawn(
      "shadow",
      g.position.clone().set(130.5, 11.02, 206.5),
    );
    m.update(0.016);
    const light = shadow.float > 0;
    m.remove(shadow);
    const jelly = m.spawn("jelly", g.position.clone().set(126.5, 11.02, 206.5));
    m.hit(jelly);
    const split = m.mobs.length === 2 && m.mobs.every((o: any) => o.small);
    for (const mob of [...m.mobs]) m.remove(mob);
    g.world.set(127, 11, 203, 7);
    g.world.set(127, 12, 203, 7);
    g.position.set(127.5, 11.02, 207.5);
    const bug = m.spawn("chomper", g.position.clone().set(127.5, 11.02, 202.7));
    bug.fun = 100;
    for (let i = 0; i < 20; i++) m.update(0.03);
    return { quiet, heard, light, split, wood: g.world.get(127, 11, 203) };
  });
  expect(result).toEqual({
    quiet: true,
    heard: true,
    light: true,
    split: true,
    wood: 0,
  });
});

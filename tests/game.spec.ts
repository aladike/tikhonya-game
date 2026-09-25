import { test, expect } from "@playwright/test";
test("start, movement, jump, throw and help", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await page.getByRole("button", { name: "Отправиться в приключение" }).click();
  await expect(page.locator("#hud")).toBeVisible();
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(500);
  await page.keyboard.up("KeyW");
  await page.keyboard.press("Space");
  await page.keyboard.press("KeyQ");
  await expect(page.locator("#toast")).toContainText("Шишка");
  await page.getByRole("button", { name: "Как играть", exact: true }).click();
  await expect(page.locator(".help-grid")).toBeVisible();
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.screenshot({
    path: `test-results/play-${test.info().project.name}.png`,
  });
  expect(errors).toEqual([]);
});
test("flower delivery and hiding keep the run playable", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Отправиться в приключение" }).click();
  await page.evaluate(async () => {
    const game = (
      window as unknown as {
        __game: {
          position: { set: (x: number, y: number, z: number) => void };
        };
      }
    ).__game;
    game.position.set(0, 0, -17);
  });
  await page.keyboard.press("KeyE");
  await expect(page.locator("#objective")).toHaveText("Отнеси цветок домой");
  await page.evaluate(async () => {
    const game = (
      window as unknown as {
        __game: {
          position: { set: (x: number, y: number, z: number) => void };
        };
      }
    ).__game;
    game.position.set(-2, 0, 5);
  });
  await page.keyboard.press("KeyE");
  await expect(page.locator("#mode")).toHaveText("В укрытии");
  await page.keyboard.press("KeyE");
  await expect(page.locator("#mode")).not.toHaveText("В укрытии");
  await page.evaluate(async () => {
    const game = (
      window as unknown as {
        __game: {
          position: { set: (x: number, y: number, z: number) => void };
        };
      }
    ).__game;
    game.position.set(0, 0, 10);
  });
  await page.keyboard.press("KeyE");
  await expect(page.locator("#toast")).toContainText("смелость");
  await expect(page.locator("#flower-count")).toHaveText("1");
});
test("helper finds resources, map unlocks and save survives reload", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Отправиться в приключение" }).click();
  await page.getByRole("button", { name: "Друзья" }).click();
  await page.locator('[data-command="fetch"]').click();
  await expect(page.locator("#toast")).toContainText("Палочка", {
    timeout: 15000,
  });
  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Сохранить файл" }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Отправиться в приключение" }).click();
  const wood = await page.evaluate(
    () => JSON.parse(localStorage.getItem("tikhonya-save-v2")!).inventory.wood,
  );
  expect(wood).toBeGreaterThan(0);
});
test("a delivered flower becomes a house used by the dog", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Отправиться в приключение" }).click();
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.position.set(0, 0, -17);
    g.act();
    g.position.set(0, 0, 10);
    g.act();
  });
  await expect(page.locator("#zone-name")).toHaveText("Домашняя поляна");
  await page.getByRole("button", { name: "Дом и постройки" }).click();
  await page.locator('[data-recipe="0"]').click();
  await page.evaluate(() => {
    (window as any).__game.position.set(-5, 0, 10);
  });
  await expect(page.locator("#action-label")).toHaveText("Поставить");
  await page.keyboard.press("KeyE");
  await expect(page.locator("#toast")).toContainText("готов");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("tikhonya-save-v2")!).buildings,
    ),
  ).toContain("doghouse");
  await page.getByRole("button", { name: "Дом и постройки" }).click();
  await page.locator("#night-request").click();
  await page.locator("#accept-request").click();
  await expect(page.locator("#zone-name")).toHaveText("Серебряный ручей");
});
test("quiet steps stay silent, running makes waves, and a catch retains the flower", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Отправиться в приключение" }).click();
  await page.keyboard.down("KeyC");
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(850);
  await page.keyboard.up("KeyW");
  await page.keyboard.up("KeyC");
  expect(await page.evaluate(() => (window as any).__game.rings.length)).toBe(
    0,
  );
  await page.keyboard.down("ShiftLeft");
  await page.keyboard.down("KeyW");
  await expect
    .poll(() => page.evaluate(() => (window as any).__game.rings.length))
    .toBeGreaterThan(0);
  await page.keyboard.up("KeyW");
  await page.keyboard.up("ShiftLeft");
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.position.set(0, 0, -17);
    g.act();
    g.bubul.g.position.copy(g.position);
  });
  await expect(page.locator("#toast")).toContainText("Апчхи");
  expect(await page.evaluate(() => (window as any).__game.carrying)).toBe(true);
});
test("returning through the map still allows delivery at home", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Отправиться в приключение" }).click();
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.position.set(0, 0, -17);
    g.act();
  });
  await page.getByRole("button", { name: "Карта леса" }).click();
  await page.locator("#map-home").click();
  await expect(page.locator("#action-label")).toHaveText("Домой");
  await page.keyboard.press("KeyE");
  await expect(page.locator("#flower-count")).toHaveText("1");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("tikhonya-save-v2")!).inventory
            .flower,
      ),
    )
    .toBe(1);
});

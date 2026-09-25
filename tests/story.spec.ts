import { test, expect } from "@playwright/test";
test("four gifts unlock friends, helper puzzles and the treehouse", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await page.getByRole("button", { name: "Отправиться в приключение" }).click();
  // Positions are arranged by the test; actual interaction, inventory, map and win logic run unchanged.
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.position.set(0, 0, -17);
    g.act();
    g.position.set(0, 0, 10);
    g.act();
  });
  for (let zone = 0; zone < 4; zone++) {
    await page.getByRole("button", { name: "Карта леса" }).click();
    await page.locator(`[data-story-zone="${zone}"]`).click();
    await page.evaluate(() => {
      const w = window as any;
      w.__game.position.copy(w.__story.gift.position);
      w.__game.position.y = 0;
    });
    if (zone === 0) {
      await expect(page.locator("#action-label")).toHaveText("Позвать кошку");
      await page.keyboard.press("KeyE");
      await expect(page.locator("#action-label")).toHaveText("Взять подарок");
    }
    await expect(page.locator("#action-label")).toHaveText("Взять подарок");
    await page.keyboard.press("KeyE");
    await expect(page.locator("#objective")).toContainText("Подари");
    await page.evaluate(() => {
      const w = window as any;
      w.__game.position.copy(w.__story.targetMonster().position);
      w.__game.position.x += 1.8;
    });
    await expect(page.locator("#action-label")).toHaveText("Подарить");
    await page.keyboard.press("KeyE");
    await expect(page.locator("#panel")).toBeVisible();
    await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  }
  await expect(page.locator("#friend-count")).toHaveText("4 / 4");
  await page.getByRole("button", { name: "Карта леса" }).click();
  await page.locator('[data-story-zone="4"]').click();
  await page.getByRole("button", { name: "Друзья", exact: false }).click();
  for (const id of ["dog", "cat"])
    await page.locator(`[data-helper="${id}"]`).click();
  for (const id of ["beetle", "spider"])
    await page.locator(`[data-helper="${id}"]`).click();
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.evaluate(() => {
    (window as any).__game.position.set(0, 0, -2.3);
  });
  await expect(page.locator("#action-label")).toHaveText("Позвать жука");
  await page.keyboard.press("KeyE");
  await expect(page.locator("#toast")).toContainText("отодвинул");
  await page.evaluate(() => {
    (window as any).__game.position.set(0, 0, -8);
  });
  await expect(page.locator("#action-label")).toHaveText("Позвать паука");
  await page.keyboard.press("KeyE");
  await expect(page.locator("#toast")).toContainText("сплёл");
  await page.evaluate(() => {
    (window as any).__game.position.set(0, 0, -19);
  });
  await expect(page.locator("#action-label")).toHaveText("Дом на дереве");
  await page.keyboard.press("KeyE");
  await expect(
    page.getByRole("heading", { name: "Дом на Старом дереве!" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("tikhonya-save-v2")!).buildings,
    ),
  ).toContain("treehouse");
  await page
    .getByRole("button", { name: "Ура! Продолжить исследовать" })
    .click();
  await page.screenshot({
    path: `test-results/treehouse-${test.info().project.name}.png`,
  });
  expect(errors).toEqual([]);
});

import { chromium, webkit, firefox, devices } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
const remote = process.env.GAME_TEST_URL;
await mkdir("test-results", { recursive: true });
for (const [name, type, options] of [
  ["chromium", chromium, devices["Desktop Chrome"]],
  ["webkit", webkit, devices["iPad (gen 7) landscape"]],
  ...(process.platform !== "darwin" || process.env.GAME_TEST_FIREFOX
    ? [["firefox", firefox, devices["Desktop Firefox"]]]
    : []),
]) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      let path = decodeURIComponent(url.pathname).replace(
        /^\/tikhonya-game\//,
        "",
      );
      if (path.includes("..")) throw new Error("path");
      if (!path) path = "index.html";
      const data = await readFile(`dist/${path}`);
      const ext = path.split(".").pop();
      res.setHeader(
        "Content-Type",
        {
          html: "text/html",
          js: "text/javascript",
          css: "text/css",
          png: "image/png",
          svg: "image/svg+xml",
          webmanifest: "application/manifest+json",
          json: "application/json",
        }[ext] || "application/octet-stream",
      );
      res.end(data);
    } catch {
      res.statusCode = 404;
      res.end();
    }
  });
  if (!remote)
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const target =
    remote || `http://127.0.0.1:${server.address().port}/tikhonya-game/`;
  const browser = await type.launch({
    headless: !process.env.CI,
    ...(name === "chromium"
      ? { args: ["--use-angle=swiftshader", "--enable-webgl"] }
      : {}),
  });
  const stopServer = async () => {
    if (server.listening) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  };
  try {
    const context = await browser.newContext({
      ...options,
      acceptDownloads: true,
    });
    const page = await context.newPage();
    const errors = [],
      foreign = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (
        new URL(r.url()).origin !== new URL(target).origin &&
        !r.url().startsWith("blob:") &&
        !r.url().startsWith("data:")
      )
        foreign.push(r.url());
    });
    await page.goto(target);
    await page
      .getByRole("button", { name: /Начать строить|Продолжить строить/ })
      .click();
    await page.waitForFunction(
      () => !!navigator.serviceWorker.controller,
      {},
      { timeout: 20000 },
    );
    await page.getByRole("button", { name: "Настройки", exact: true }).click();
    await page.locator("#quality").selectOption("low");
    await page.locator("#music").fill("0");
    const downloading = page.waitForEvent("download");
    await page.locator("#export-save").click();
    const file = await downloading;
    assert.equal(file.suggestedFilename(), "tikhonya-island.json");
    const exported = JSON.parse(await readFile(await file.path(), "utf8"));
    assert.equal(exported.kind, "tikhonya-island");
    assert.equal(exported.version, 1);
    await page.locator("#save-file").setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":999}'),
    });
    await page
      .getByText("Этот файл не похож на сохранение блочного острова.")
      .waitFor();
    exported.name = "Мой замок";
    await page.locator("#save-file").setInputFiles({
      name: "island.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(exported)),
    });
    await page
      .getByRole("button", { name: "Продолжить строить", exact: true })
      .click();
    assert.equal(await page.locator("#world-label").textContent(), "Мой замок");
    await page.getByRole("button", { name: "Настройки", exact: true }).click();

    await page.getByRole("button", { name: "Закрыть", exact: true }).click();
    await page.waitForFunction(() =>
      document.querySelector("#save-status")?.textContent?.includes("✓"),
    );
    // Stop the actual origin: WebKit 1.63 has a confirmed setOffline/SW emulation bug (#42775).
    if (!remote) {
      await stopServer();
      await assert.rejects(fetch(target));
    }
    await page.reload();
    await page
      .getByRole("button", { name: /Начать строить|Продолжить строить/ })
      .click();
    await page.getByRole("button", { name: "Настройки", exact: true }).click();
    assert.equal(await page.locator("#music").inputValue(), "0");
    assert.equal(await page.locator("#quality").inputValue(), "low");
    await page.getByRole("button", { name: "Закрыть", exact: true }).click();
    await page.screenshot({
      path: `test-results/${remote ? "published" : "offline"}-${name}.png`,
    });
    const manifest = await page.evaluate(async () => {
      const url = document.querySelector('link[rel="manifest"]').href;
      return await (await fetch(url)).json();
    });
    assert.equal(manifest.display, "standalone");
    assert.deepEqual(errors, []);
    assert.deepEqual(foreign, []);
    console.log(
      `${name}: ${remote ? "published reload" : "origin stopped, offline reload"}, backup export/import validation, settings retained, no external requests: PASS`,
    );
  } finally {
    await browser.close();
    await stopServer();
  }
}
